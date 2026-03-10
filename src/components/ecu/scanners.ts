import { LangEntry, ScanMode } from "./types";

export type ScanResult = {
  entries: LangEntry[];
  log: string[];
};

export function runScanOnBuffer(
  buf: Uint8Array,
  mode: ScanMode,
  minLen: number,
  baseAddress: number,
  onProgress: (pct: number, log: string[]) => void,
  onDone: (result: ScanResult) => void,
) {
  const worker = new Worker(
    new URL("../../workers/scanner.worker.ts", import.meta.url),
    { type: "module" },
  );

  worker.onmessage = (e) => {
    const msg = e.data;
    if (msg.type === "progress") {
      onProgress(msg.pct, msg.log);
    } else if (msg.type === "done") {
      onDone({ entries: msg.entries, log: msg.log });
      worker.terminate();
    }
  };

  worker.onerror = (err) => {
    console.error("Scanner worker error:", err);
    onDone({ entries: [], log: [`Ошибка сканирования: ${err.message}`] });
    worker.terminate();
  };

  // Копируем буфер перед передачей — иначе оригинал обнуляется
  const copy = buf.slice(0);
  worker.postMessage({ buf: copy, mode, minLen, baseAddress }, [copy.buffer]);
}