export function decodeBmpToCanvas(buf: Uint8Array): HTMLCanvasElement | null {
  if (buf.length < 54) return null;
  if (buf[0] !== 0x42 || buf[1] !== 0x4d) return null;

  const view = new DataView(buf.buffer, buf.byteOffset);
  const pixelOffset = view.getUint32(10, true);
  const width = view.getInt32(18, true);
  const height = view.getInt32(22, true);
  const bpp = view.getUint16(28, true);
  const compression = view.getUint32(30, true);
  const colorCount = view.getUint32(46, true);

  const absHeight = Math.abs(height);
  const flipped = height > 0; // положительная высота = снизу вверх

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = absHeight;
  const ctx = canvas.getContext("2d")!;
  const imgData = ctx.createImageData(width, absHeight);
  const pixels = imgData.data;

  // Читаем палитру (для 1/4/8 bpp)
  const paletteOffset = 14 + view.getUint32(14, true); // BITMAPINFOHEADER size
  const numColors = colorCount > 0 ? colorCount : (bpp <= 8 ? (1 << bpp) : 0);
  const palette: [number, number, number][] = [];
  for (let i = 0; i < numColors; i++) {
    const off = paletteOffset + i * 4;
    if (off + 2 < buf.length) {
      palette.push([buf[off + 2], buf[off + 1], buf[off]]);
    }
  }

  const rowSize = Math.floor((bpp * width + 31) / 32) * 4; // выровнено по 4 байта

  for (let row = 0; row < absHeight; row++) {
    const srcRow = flipped ? (absHeight - 1 - row) : row;
    const rowStart = pixelOffset + srcRow * rowSize;

    for (let col = 0; col < width; col++) {
      let r = 0, g = 0, b = 0;

      if (bpp === 1) {
        const byteIdx = rowStart + Math.floor(col / 8);
        const bit = 7 - (col % 8);
        const idx = (buf[byteIdx] >> bit) & 1;
        if (palette.length >= 2) {
          [r, g, b] = palette[idx];
        } else {
          // нет палитры — 0=чёрный, 1=белый
          const v = idx * 255;
          [r, g, b] = [v, v, v];
        }

      } else if (bpp === 4) {
        const byteIdx = rowStart + Math.floor(col / 2);
        const idx = col % 2 === 0 ? (buf[byteIdx] >> 4) & 0xf : buf[byteIdx] & 0xf;
        [r, g, b] = palette[idx] ?? [0, 0, 0];

      } else if (bpp === 8) {
        const idx = buf[rowStart + col];
        [r, g, b] = palette[idx] ?? [idx, idx, idx];

      } else if (bpp === 24) {
        const off = rowStart + col * 3;
        b = buf[off]; g = buf[off + 1]; r = buf[off + 2];

      } else if (bpp === 32) {
        const off = rowStart + col * 4;
        b = buf[off]; g = buf[off + 1]; r = buf[off + 2];
      }

      const pixelIdx = (row * width + col) * 4;
      pixels[pixelIdx] = r;
      pixels[pixelIdx + 1] = g;
      pixels[pixelIdx + 2] = b;
      pixels[pixelIdx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

export function decodeBmpToDataUrl(buf: Uint8Array): string | null {
  const canvas = decodeBmpToCanvas(buf);
  if (!canvas) return null;

  // Для монохромных BMP: если фон светлый — инвертируем (LCD стиль: белый текст на чёрном)
  const view = new DataView(buf.buffer, buf.byteOffset);
  const bpp = view.getUint16(28, true);
  if (bpp <= 8) {
    const paletteOffset = 14 + view.getUint32(14, true);
    const r0 = buf[paletteOffset + 2];
    const g0 = buf[paletteOffset + 1];
    const b0 = buf[paletteOffset + 0];
    const brightness0 = (r0 + g0 + b0) / 3;
    if (brightness0 > 128) {
      // первый цвет светлый — инвертируем чтобы фон стал чёрным
      const ctx = canvas.getContext("2d")!;
      ctx.globalCompositeOperation = "difference";
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
    }
  }

  return canvas.toDataURL("image/png");
}

// Рендер сырых 1-bit данных из прошивки как монохромный LCD-экран
// width — ширина в пикселях (кол-во бит в строке), rows — высота
export function renderRaw1bit(
  buf: Uint8Array,
  addressHex: string,
  width = 128,
  rows = 16,
  scale = 3
): string {
  const addr = parseInt(addressHex, 16);
  const bytesPerRow = Math.ceil(width / 8);
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = rows * scale;
  const ctx = canvas.getContext("2d")!;

  // Фон — чёрный (LCD стиль)
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < width; col++) {
      const byteIdx = addr + row * bytesPerRow + Math.floor(col / 8);
      if (byteIdx >= buf.length) continue;
      const bit = 7 - (col % 8);
      const on = (buf[byteIdx] >> bit) & 1;
      if (on) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(col * scale, row * scale, scale, scale);
      }
    }
  }

  return canvas.toDataURL("image/png");
}