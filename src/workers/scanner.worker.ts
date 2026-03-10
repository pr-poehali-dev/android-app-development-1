// Web Worker: всё сканирование идёт в отдельном потоке, UI не блокируется

type ScanMode = "all" | "sjis" | "utf16le" | "utf16be" | "utf8";

interface LangEntry {
  id: number;
  address: string;
  original: string;
  translated: string;
  bytes: number;
  status: "pending" | "translated";
}

function isJapanese(code: number): boolean {
  return (
    (code >= 0x3000 && code <= 0x9fff) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xff00 && code <= 0xffef)
  );
}

function scanUtf16LE(buf: Uint8Array, minLen: number): LangEntry[] {
  const results: LangEntry[] = [];
  let i = 0;
  while (i < buf.length - 1) {
    const code = buf[i] | (buf[i + 1] << 8);
    if (isJapanese(code)) {
      const start = i;
      let str = "";
      while (i < buf.length - 1) {
        const c = buf[i] | (buf[i + 1] << 8);
        if (!isJapanese(c) && c !== 0x0020 && c !== 0x3000) break;
        if (c === 0x0000) break;
        str += String.fromCharCode(c);
        i += 2;
      }
      if (str.trim().length >= minLen) {
        results.push({ id: 0, address: "0x" + start.toString(16).toUpperCase().padStart(8, "0"), original: str.trim(), translated: "", bytes: i - start, status: "pending" });
      }
      if (i === start) i += 2; // гарантируем продвижение
    } else {
      i += 2;
    }
  }
  return results;
}

function scanUtf16BE(buf: Uint8Array, minLen: number): LangEntry[] {
  const results: LangEntry[] = [];
  let i = 0;
  while (i < buf.length - 1) {
    const code = (buf[i] << 8) | buf[i + 1];
    if (isJapanese(code)) {
      const start = i;
      let str = "";
      while (i < buf.length - 1) {
        const c = (buf[i] << 8) | buf[i + 1];
        if (!isJapanese(c) && c !== 0x0020 && c !== 0x3000) break;
        if (c === 0x0000) break;
        str += String.fromCharCode(c);
        i += 2;
      }
      if (str.trim().length >= minLen) {
        results.push({ id: 0, address: "0x" + start.toString(16).toUpperCase().padStart(8, "0"), original: str.trim(), translated: "", bytes: i - start, status: "pending" });
      }
      if (i === start) i += 2; // гарантируем продвижение
    } else {
      i += 2;
    }
  }
  return results;
}

function scanUtf8(buf: Uint8Array, minLen: number): LangEntry[] {
  const results: LangEntry[] = [];
  let i = 0;
  while (i < buf.length) {
    if (buf[i] >= 0xe3 && buf[i] <= 0xef && i + 1 < buf.length && (buf[i + 1] & 0xc0) === 0x80) {
      const start = i;
      const chars: number[] = [];
      while (i < buf.length - 2) {
        if (!(buf[i] >= 0xe3 && buf[i] <= 0xef && (buf[i + 1] & 0xc0) === 0x80 && (buf[i + 2] & 0xc0) === 0x80)) break;
        const cp = ((buf[i] & 0x0f) << 12) | ((buf[i + 1] & 0x3f) << 6) | (buf[i + 2] & 0x3f);
        if (!isJapanese(cp)) break;
        chars.push(cp);
        i += 3;
      }
      if (chars.length >= minLen) {
        const str = chars.map(c => String.fromCharCode(c)).join("");
        results.push({ id: 0, address: "0x" + start.toString(16).toUpperCase().padStart(8, "0"), original: str, translated: "", bytes: i - start, status: "pending" });
      }
      if (i === start) i++; // гарантируем продвижение
    } else {
      i++;
    }
  }
  return results;
}

function isSjisLead(b: number): boolean {
  return (b >= 0x81 && b <= 0x9f) || (b >= 0xe0 && b <= 0xef);
}
function isSjisTrail(b: number): boolean {
  return (b >= 0x40 && b <= 0x7e) || (b >= 0x80 && b <= 0xfc);
}
function isHalfKana(b: number): boolean {
  return b >= 0xa1 && b <= 0xdf;
}

function scanShiftJIS(buf: Uint8Array, minLen: number): LangEntry[] {
  const results: LangEntry[] = [];
  const decoder = new TextDecoder("shift-jis", { fatal: false });
  let i = 0;
  while (i < buf.length) {
    if (isSjisLead(buf[i]) || isHalfKana(buf[i])) {
      const start = i;
      const raw: number[] = [];
      while (i < buf.length) {
        if (isSjisLead(buf[i]) && i + 1 < buf.length && isSjisTrail(buf[i + 1])) {
          raw.push(buf[i], buf[i + 1]);
          i += 2;
        } else if (isHalfKana(buf[i])) {
          raw.push(buf[i]);
          i++;
        } else {
          // лид-байт без валидного трейла — пропускаем байт, чтобы не зависнуть
          if (i === start) i++;
          break;
        }
      }
      if (raw.length >= minLen * 2) {
        try {
          const str = decoder.decode(new Uint8Array(raw)).trim();
          if (str.length >= minLen && /[\u3000-\u9fff\uff00-\uffef]/.test(str)) {
            results.push({ id: 0, address: "0x" + start.toString(16).toUpperCase().padStart(8, "0"), original: str, translated: "", bytes: raw.length, status: "pending" });
          }
        } catch (_e) { /* skip */ }
      }
    } else {
      i++;
    }
  }
  return results;
}

// Ищем структуру bitmap перед текстом:
// Типичный паттерн в ECU: [2b width_le][2b height_le][raw 1bpp bits][text]
// или [BM header][pixels][text]
function detectBitmapBeforeText(buf: Uint8Array, textOffset: number): { bmpOffset: number; w: number; h: number } | null {
  // 1. Проверяем BMP с заголовком ("BM") — ищем в радиусе 4096 байт до текста
  for (let back = 2; back < Math.min(textOffset, 4096); back++) {
    const i = textOffset - back;
    if (buf[i] === 0x42 && buf[i + 1] === 0x4d && i + 54 < buf.length) {
      const view = new DataView(buf.buffer);
      const w = view.getInt32(i + 18, true);
      const h = Math.abs(view.getInt32(i + 22, true));
      const bpp = view.getUint16(i + 28, true);
      const headerSize = view.getUint32(i + 14, true);
      if (w > 0 && w <= 640 && h > 0 && h <= 64 && [1,4,8].includes(bpp) && headerSize >= 40) {
        return { bmpOffset: i, w, h };
      }
    }
  }

  // 2. Пробуем структуру [width:u16le][height:u16le][1bpp data]
  // Ищем до 256 байт назад — типичные размеры экрана: 128,160,320 px ширина, 8-64 px высота
  const VALID_WIDTHS = [64, 80, 96, 100, 112, 128, 132, 160, 176, 192, 240, 320];
  const view = new DataView(buf.buffer);
  for (let back = 4; back < Math.min(textOffset, 256); back++) {
    const i = textOffset - back;
    if (i + 4 > buf.length) continue;
    const w = view.getUint16(i, true);
    const h = view.getUint16(i + 2, true);
    if (VALID_WIDTHS.includes(w) && h >= 1 && h <= 64) {
      const expectedBytes = Math.ceil(w / 8) * h;
      if (expectedBytes === back - 4) {
        return { bmpOffset: i + 4, w, h };
      }
    }
    // Попробуем big-endian
    const wbe = view.getUint16(i, false);
    const hbe = view.getUint16(i + 2, false);
    if (VALID_WIDTHS.includes(wbe) && hbe >= 1 && hbe <= 64) {
      const expectedBytes = Math.ceil(wbe / 8) * hbe;
      if (expectedBytes === back - 4) {
        return { bmpOffset: i + 4, w: wbe, h: hbe };
      }
    }
  }

  // 3. Fallback — просто указываем offset прямо на текст, без размеров
  return null;
}

function attachBmpToEntries(entries: LangEntry[], buf: Uint8Array, baseAddress: number): LangEntry[] {
  return entries.map(e => {
    const virtualAddr = parseInt(e.address, 16);
    const fileOffset = virtualAddr - baseAddress;
    if (fileOffset < 0 || fileOffset >= buf.length) return e;
    const result = detectBitmapBeforeText(buf, fileOffset);
    if (result) {
      return {
        ...e,
        bmpAddress: "0x" + (result.bmpOffset + baseAddress).toString(16).toUpperCase().padStart(8, "0"),
        bmpWidth: result.w,
        bmpHeight: result.h,
      };
    }
    return e;
  });
}

function dedup(entries: LangEntry[]): LangEntry[] {
  const map = new Map<string, LangEntry>();
  for (const e of entries) {
    const existing = map.get(e.address);
    if (!existing || e.original.length > existing.original.length) {
      map.set(e.address, e);
    }
  }
  return Array.from(map.values())
    .sort((a, b) => parseInt(a.address, 16) - parseInt(b.address, 16))
    .map((e, i) => ({ ...e, id: i + 1 }));
}

self.onmessage = (e: MessageEvent<{ buf: ArrayBuffer; mode: ScanMode; minLen: number; baseAddress: number }>) => {
  const buf = new Uint8Array(e.data.buf);
  const { mode, minLen, baseAddress = 0 } = e.data;
  const log: string[] = [];
  let all: LangEntry[] = [];

  log.push(`Файл: ${buf.length.toLocaleString()} байт`);
  self.postMessage({ type: "progress", pct: 2, log: [...log] });

  const MAX_RESULTS = 5000; // лимит строк — больше не нужно для ECU дампов

  const steps: Array<{ label: string; fn: () => LangEntry[]; pct: number }> = [];
  if (mode === "sjis" || mode === "all")    steps.push({ label: "Shift-JIS", fn: () => scanShiftJIS(buf, minLen), pct: 30 });
  if (mode === "utf16le" || mode === "all") steps.push({ label: "UTF-16LE",  fn: () => scanUtf16LE(buf, minLen),  pct: 55 });
  if (mode === "utf16be" || mode === "all") steps.push({ label: "UTF-16BE",  fn: () => scanUtf16BE(buf, minLen),  pct: 75 });
  if (mode === "utf8" || mode === "all")    steps.push({ label: "UTF-8",     fn: () => scanUtf8(buf, minLen),     pct: 90 });

  for (const step of steps) {
    log.push(`Сканирую ${step.label}...`);
    self.postMessage({ type: "progress", pct: step.pct - 5, log: [...log] });
    const found = step.fn();
    log[log.length - 1] = `${step.label}: найдено ${found.length} строк`;
    all = all.concat(found);
    self.postMessage({ type: "progress", pct: step.pct, log: [...log] });
  }

  self.postMessage({ type: "progress", pct: 94, log: [...log, "Дедупликация..."] });

  const deduped = dedup(all).slice(0, MAX_RESULTS).map(e => ({
    ...e,
    address: "0x" + (parseInt(e.address, 16) + baseAddress).toString(16).toUpperCase().padStart(8, "0"),
  }));
  log.push(`Базовый адрес: 0x${baseAddress.toString(16).toUpperCase().padStart(8, "0")}`);
  log.push(`Итого уникальных адресов: ${deduped.length}${deduped.length === MAX_RESULTS ? ` (показаны первые ${MAX_RESULTS})` : ""}`);

  self.postMessage({ type: "progress", pct: 96, log: [...log, "Поиск bitmap у каждого адреса..."] });
  const withBmp = attachBmpToEntries(deduped, buf, baseAddress);
  const foundBmp = withBmp.filter(e => e.bmpAddress).length;
  log.push(`Bitmap найдено у ${foundBmp} из ${withBmp.length} записей`);

  self.postMessage({ type: "progress", pct: 99, log: [...log] });
  self.postMessage({ type: "done", entries: withBmp, log: [...log] });
};