import { useState, useMemo, useRef } from "react";
import Icon from "@/components/ui/icon";
import { renderRaw1bit, decodeBmpToDataUrl } from "./bmpRender";

type Props = {
  fileBuffer: Uint8Array | null;
  baseAddress: number;
};

export default function TabExplorer({ fileBuffer, baseAddress }: Props) {
  const [addrInput, setAddrInput] = useState("0x0191C796");
  const [committed, setCommitted] = useState("0x0191C796");
  const [width, setWidth] = useState(128);
  const [height, setHeight] = useState(16);
  const [scale, setScale] = useState(3);
  const [offsetBefore, setOffsetBefore] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const fileOffset = useMemo(() => {
    const v = parseInt(committed, 16);
    if (isNaN(v)) return null;
    const off = v - baseAddress + offsetBefore;
    if (!fileBuffer || off < 0 || off >= fileBuffer.length) return null;
    return off;
  }, [committed, baseAddress, offsetBefore, fileBuffer]);

  const hexDump = useMemo(() => {
    if (!fileBuffer || fileOffset === null) return [];
    const rows: { offset: number; bytes: number[] }[] = [];
    const startOff = Math.max(0, fileOffset - 64);
    for (let r = 0; r < 24; r++) {
      const off = startOff + r * 16;
      if (off >= fileBuffer.length) break;
      const bytes: number[] = [];
      for (let c = 0; c < 16; c++) {
        bytes.push(off + c < fileBuffer.length ? fileBuffer[off + c] : -1);
      }
      rows.push({ offset: off, bytes });
    }
    return rows;
  }, [fileBuffer, fileOffset]);

  const bmpUrl = useMemo(() => {
    if (!fileBuffer || fileOffset === null) return null;
    const slice = fileBuffer.slice(fileOffset);
    if (slice[0] === 0x42 && slice[1] === 0x4d) return decodeBmpToDataUrl(slice);
    const offsetHex = "0x" + fileOffset.toString(16).toUpperCase();
    return renderRaw1bit(fileBuffer, offsetHex, width, height, scale);
  }, [fileBuffer, fileOffset, width, height, scale]);

  const handleFind = () => setCommitted(addrInput);

  if (!fileBuffer) {
    return (
      <div className="p-8 text-center text-[#2a4a5a] font-['IBM_Plex_Mono'] text-sm">
        Загрузите файл прошивки
      </div>
    );
  }

  return (
    <div className="animate-slide-in-up flex flex-col gap-4">
      {/* Панель управления */}
      <div className="p-4 rounded border border-[#1a2a38] bg-[#090f15]">
        <div className="text-[10px] font-['IBM_Plex_Mono'] text-[#2a5a6a] tracking-widest uppercase mb-3">ИССЛЕДОВАТЕЛЬ АДРЕСОВ</div>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-[10px] text-[#4a6a7a] font-['IBM_Plex_Mono'] block mb-1">Адрес (HEX)</label>
            <input
              ref={inputRef}
              value={addrInput}
              onChange={e => setAddrInput(e.target.value.trim())}
              onKeyDown={e => e.key === "Enter" && handleFind()}
              className="px-2 py-1.5 rounded border border-[#1a3a2a] bg-[#060c10] text-sm font-['IBM_Plex_Mono'] text-[#00ff88] outline-none focus:border-[#00ff88]/40 w-36"
              placeholder="0x0191C796"
            />
          </div>
          <button
            onClick={handleFind}
            className="flex items-center gap-2 px-4 py-1.5 rounded border border-[#00ff88]/40 bg-[#00ff88]/10 text-[#00ff88] text-xs font-['IBM_Plex_Mono'] font-semibold hover:bg-[#00ff88]/20 transition-all mb-0.5"
          >
            <Icon name="Search" size={12} />
            Найти
          </button>
          <div>
            <label className="text-[10px] text-[#4a6a7a] font-['IBM_Plex_Mono'] block mb-1">Сдвиг (байт)</label>
            <input type="number" value={offsetBefore} onChange={e => setOffsetBefore(Number(e.target.value))}
              className="px-2 py-1.5 rounded border border-[#1a2a38] bg-[#060c10] text-sm font-['IBM_Plex_Mono'] text-[#8ab8c8] outline-none w-20" />
          </div>
          <div>
            <label className="text-[10px] text-[#4a6a7a] font-['IBM_Plex_Mono'] block mb-1">Ширина px</label>
            <input type="number" value={width} onChange={e => setWidth(Number(e.target.value))} min={8} max={512} step={8}
              className="px-2 py-1.5 rounded border border-[#1a2a38] bg-[#060c10] text-sm font-['IBM_Plex_Mono'] text-[#8ab8c8] outline-none w-20" />
          </div>
          <div>
            <label className="text-[10px] text-[#4a6a7a] font-['IBM_Plex_Mono'] block mb-1">Высота px</label>
            <input type="number" value={height} onChange={e => setHeight(Number(e.target.value))} min={1} max={128}
              className="px-2 py-1.5 rounded border border-[#1a2a38] bg-[#060c10] text-sm font-['IBM_Plex_Mono'] text-[#8ab8c8] outline-none w-20" />
          </div>
          <div>
            <label className="text-[10px] text-[#4a6a7a] font-['IBM_Plex_Mono'] block mb-1">Масштаб</label>
            <input type="number" value={scale} onChange={e => setScale(Number(e.target.value))} min={1} max={8}
              className="px-2 py-1.5 rounded border border-[#1a2a38] bg-[#060c10] text-sm font-['IBM_Plex_Mono'] text-[#8ab8c8] outline-none w-16" />
          </div>
        </div>
        {fileOffset !== null && (
          <div className="mt-2 text-[10px] font-['IBM_Plex_Mono'] text-[#2a5a4a]">
            Offset в файле: 0x{fileOffset.toString(16).toUpperCase().padStart(8, "0")} · {fileOffset.toLocaleString()} байт
          </div>
        )}
        {fileOffset === null && committed && (
          <div className="mt-2 text-[10px] font-['IBM_Plex_Mono'] text-[#ff4a4a]">
            Адрес вне диапазона файла
          </div>
        )}
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-4">
        {/* Bitmap рендер */}
        <div className="p-4 rounded border border-[#1a2a38] bg-[#090f15]">
          <div className="text-[10px] font-['IBM_Plex_Mono'] text-[#2a5a6a] tracking-widest uppercase mb-3">РЕНДЕР BITMAP</div>
          {bmpUrl ? (
            <div className="inline-block rounded border border-[#2a3a28] bg-black p-2">
              <img src={bmpUrl} alt="render" style={{ display: "block", imageRendering: "pixelated", maxWidth: "100%" }} />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[#2a4a5a] font-['IBM_Plex_Mono'] text-xs">
              <Icon name="ImageOff" size={14} /> Нажми «Найти»
            </div>
          )}
          <div className="mt-3 text-[10px] text-[#2a5a4a] font-['IBM_Plex_Mono'] leading-relaxed">
            Подбирай Ширину и Высоту пока текст не станет читаемым.<br />
            Сдвиг — смещение от адреса до начала bitmap (может быть отрицательным).
          </div>
        </div>

        {/* HEX + DEC дамп */}
        <div className="p-4 rounded border border-[#1a2a38] bg-[#090f15] overflow-auto max-h-[500px]">
          <div className="text-[10px] font-['IBM_Plex_Mono'] text-[#2a5a6a] tracking-widest uppercase mb-2">HEX · DEC · ASCII</div>
          {hexDump.length === 0 ? (
            <div className="text-[#2a4a5a] font-['IBM_Plex_Mono'] text-xs">Нажми «Найти»</div>
          ) : (
            <table className="font-['IBM_Plex_Mono'] text-[10px] border-collapse w-full">
              <thead>
                <tr className="text-[9px] text-[#1a3a4a]">
                  <td className="pr-3 pb-1">АДРЕС</td>
                  <td className="pr-3 pb-1" colSpan={16}>HEX</td>
                </tr>
              </thead>
              <tbody>
                {hexDump.map(row => {
                  const isHighlight = fileOffset !== null && row.offset <= fileOffset && row.offset + 16 > fileOffset;
                  return (
                    <tr key={row.offset} className={isHighlight ? "bg-[#00ff88]/5" : ""}>
                      <td className="text-[#2a5a4a] pr-3 whitespace-nowrap align-top py-0.5">
                        {(row.offset + baseAddress).toString(16).toUpperCase().padStart(8, "0")}
                      </td>
                      <td className="align-top py-0.5">
                        <div className="flex gap-0.5 flex-wrap">
                          {row.bytes.map((b, i) => {
                            const isTarget = fileOffset !== null && row.offset + i === fileOffset;
                            return (
                              <span key={i} className="flex flex-col items-center" style={{ minWidth: 22 }}>
                                <span className={`text-center leading-tight ${b < 0 ? "text-[#1a2a38]" : isTarget ? "text-[#00ff88] font-bold" : "text-[#4a7a6a]"}`}>
                                  {b < 0 ? ".." : b.toString(16).padStart(2, "0").toUpperCase()}
                                </span>
                                <span className={`text-center leading-tight text-[9px] ${b < 0 ? "text-[#1a2a38]" : isTarget ? "text-[#fbbf24] font-bold" : "text-[#2a3a4a]"}`}>
                                  {b < 0 ? "" : b}
                                </span>
                              </span>
                            );
                          })}
                        </div>
                        <div className="text-[#2a4a3a] mt-0.5 tracking-widest">
                          {row.bytes.map(b => b < 0x20 || b > 0x7e ? "·" : String.fromCharCode(b)).join("")}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
