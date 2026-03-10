import { useState, useMemo } from "react";
import Icon from "@/components/ui/icon";
import { LangEntry } from "./types";
import { decodeBmpToDataUrl, renderRaw1bit } from "./bmpRender";

type Props = {
  entries: LangEntry[];
  selectedId: number | null;
  setSelectedId: (id: number) => void;
  onUpdateTranslation: (id: number, text: string) => void;
  fileBuffer: Uint8Array | null;
  bmpImageUrl: string | null;
  baseAddress: number;
};

async function translateJapanese(text: string): Promise<string> {
  const res = await fetch("https://functions.poehali.dev/a9a9dc11-03fd-40c6-9dbc-666f0fe668c6", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  let data = await res.json();
  // платформа может обернуть body в строку — парсим повторно
  if (typeof data === "string") data = JSON.parse(data);
  return data.translated ?? "";
}

export default function TabEditor({ entries, selectedId, setSelectedId, onUpdateTranslation, fileBuffer, bmpImageUrl, baseAddress }: Props) {
  const [translating, setTranslating] = useState(false);
  const [translateAllProgress, setTranslateAllProgress] = useState<number | null>(null);
  const [bmpZoom, setBmpZoom] = useState(false);
  const [manualBmpAddr, setManualBmpAddr] = useState("");
  const [manualWidth, setManualWidth] = useState(128);
  const [manualRows, setManualRows] = useState(16);
  const selectedEntry = entries.find(e => e.id === selectedId);

  const activeBmpAddress = manualBmpAddr || selectedEntry?.bmpAddress || selectedEntry?.address || null;
  const activeWidth = selectedEntry?.bmpWidth ?? manualWidth;
  const activeRows = selectedEntry?.bmpHeight ?? manualRows;

  const embeddedBmpUrl = useMemo(() => {
    if (!fileBuffer || !activeBmpAddress) return null;
    const virtualAddr = parseInt(activeBmpAddress, 16);
    if (isNaN(virtualAddr)) return null;
    const fileOffset = virtualAddr - baseAddress;
    if (fileOffset < 0 || fileOffset >= fileBuffer.length) return null;
    const slice = fileBuffer.slice(fileOffset);
    if (slice[0] === 0x42 && slice[1] === 0x4d) {
      return decodeBmpToDataUrl(slice);
    }
    const offsetHex = "0x" + fileOffset.toString(16).toUpperCase();
    return renderRaw1bit(fileBuffer, offsetHex, activeWidth, activeRows, 3);
  }, [fileBuffer, activeBmpAddress, baseAddress, activeWidth, activeRows]);

  const handleAutoTranslate = async () => {
    if (!selectedEntry) return;
    setTranslating(true);
    try {
      const result = await translateJapanese(selectedEntry.original);
      onUpdateTranslation(selectedEntry.id, result);
    } catch {
      // ошибка сети — оставляем поле пустым
    }
    setTranslating(false);
  };

  const handleTranslateAll = async () => {
    const pending = entries.filter(e => !e.translated);
    if (pending.length === 0) return;
    setTranslateAllProgress(0);
    for (let i = 0; i < pending.length; i++) {
      try {
        const result = await translateJapanese(pending[i].original);
        onUpdateTranslation(pending[i].id, result);
      } catch {
        // пропускаем при ошибке
      }
      setTranslateAllProgress(Math.round(((i + 1) / pending.length) * 100));
      // небольшая пауза чтобы не спамить API
      await new Promise(r => setTimeout(r, 150));
    }
    setTranslateAllProgress(null);
  };

  return (
    <div className="animate-slide-in-up flex flex-col gap-4">
      {/* Панель "Перевести всё" */}
      <div className="p-3 rounded border border-[#1a2a38] bg-[#090f15] flex items-center justify-between gap-4">
        <div className="text-xs text-[#4a6a7a] font-['IBM_Plex_Mono']">
          Непереведено: <span className="text-[#fbbf24]">{entries.filter(e => !e.translated).length}</span> строк
          {" · "}Переведено: <span className="text-[#00ff88]">{entries.filter(e => e.translated).length}</span> строк
        </div>
        <div className="flex items-center gap-3">
          {translateAllProgress !== null && (
            <div className="flex items-center gap-2">
              <div className="w-32 h-1 bg-[#0d1f17] rounded-full overflow-hidden">
                <div className="progress-bar h-full rounded-full transition-all duration-200" style={{ width: `${translateAllProgress}%` }} />
              </div>
              <span className="text-[10px] font-['IBM_Plex_Mono'] text-[#00ff88]">{translateAllProgress}%</span>
            </div>
          )}
          <button
            onClick={handleTranslateAll}
            disabled={translateAllProgress !== null || entries.filter(e => !e.translated).length === 0}
            className="flex items-center gap-2 px-4 py-1.5 rounded border border-[#00ff88]/30 bg-[#00ff88]/8 text-[#00ff88] text-xs font-['IBM_Plex_Mono'] font-semibold hover:bg-[#00ff88]/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {translateAllProgress !== null
              ? <><Icon name="Loader" size={12} className="animate-spin" /> Перевожу...</>
              : <><Icon name="Languages" size={12} /> Перевести всё</>
            }
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-4">
      {/* Left: mini list */}
      <div className="rounded border border-[#1a2a38] overflow-hidden">
        <div className="text-xs font-['IBM_Plex_Mono'] text-[#2a5a6a] border-b border-[#1a2a38] bg-[#080f14] px-3 py-2">
          СТРОКИ ПЕРЕВОДА
        </div>
        <div className="max-h-[520px] overflow-y-auto">
          {entries.map(entry => (
            <div
              key={entry.id}
              onClick={() => setSelectedId(entry.id)}
              className={`px-3 py-2.5 border-b border-[#0d1e2a] cursor-pointer transition-colors ${
                selectedId === entry.id
                  ? "bg-[#00ff88]/8 border-l-2 border-l-[#00ff88]"
                  : "hover:bg-[#0f2030]"
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-['IBM_Plex_Mono'] text-[10px] text-[#00ff88]/60">{entry.address}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${entry.status === "translated" ? "bg-[#00ff88]" : "bg-[#fbbf24]"}`} />
              </div>
              <p className="text-xs text-[#e8c87a] font-['IBM_Plex_Mono'] truncate">{entry.original}</p>
              {entry.translated && <p className="text-[10px] text-[#8ab8c8] truncate mt-0.5">{entry.translated}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Right: editor panel */}
      <div className="flex flex-col gap-3">
        {selectedEntry ? (
          <>
            <div className="p-4 rounded border border-[#1a2a38] bg-[#090f15]">
              <div className="flex items-center gap-3 mb-4">
                <Icon name="MapPin" size={14} className="text-[#00ff88]" />
                <span className="font-['IBM_Plex_Mono'] text-sm text-[#00ff88]">{selectedEntry.address}</span>
                <span className="text-xs text-[#2a4a5a] font-['IBM_Plex_Mono']">{selectedEntry.bytes} байт</span>
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-[10px] font-['IBM_Plex_Mono'] text-[#4a6a7a] tracking-widest uppercase">LCD ИЗОБРАЖЕНИЕ</div>
                  {selectedEntry?.bmpAddress && (
                    <span className="text-[10px] font-['IBM_Plex_Mono'] text-[#2a5a4a]">
                      {selectedEntry.bmpAddress} · {activeWidth}×{activeRows}px
                      {selectedEntry.bmpWidth ? " (авто)" : ""}
                    </span>
                  )}
                </div>
                {!selectedEntry?.bmpWidth && (
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <input
                      value={manualBmpAddr}
                      onChange={e => setManualBmpAddr(e.target.value.trim())}
                      placeholder="адрес bitmap..."
                      className="w-36 px-2 py-1 rounded border border-[#1a2a38] bg-[#060c10] text-[11px] font-['IBM_Plex_Mono'] text-[#00ff88] outline-none focus:border-[#00ff88]/40 placeholder-[#2a4a5a]"
                    />
                    <span className="text-[10px] text-[#2a4a5a] font-['IBM_Plex_Mono']">W</span>
                    <input type="number" value={manualWidth} onChange={e => setManualWidth(Number(e.target.value))}
                      className="w-14 px-2 py-1 rounded border border-[#1a2a38] bg-[#060c10] text-[11px] font-['IBM_Plex_Mono'] text-[#8ab8c8] outline-none"
                      min={8} max={512} step={8} />
                    <span className="text-[10px] text-[#2a4a5a] font-['IBM_Plex_Mono']">H</span>
                    <input type="number" value={manualRows} onChange={e => setManualRows(Number(e.target.value))}
                      className="w-14 px-2 py-1 rounded border border-[#1a2a38] bg-[#060c10] text-[11px] font-['IBM_Plex_Mono'] text-[#8ab8c8] outline-none"
                      min={1} max={128} />
                  </div>
                )}

                {embeddedBmpUrl ? (
                  <div
                    className="inline-block rounded border border-[#2a3a28] bg-black p-2 cursor-zoom-in hover:border-[#00ff88]/40 transition-colors"
                    onClick={() => setBmpZoom(true)}
                    title="Нажми для увеличения"
                  >
                    <img
                      src={embeddedBmpUrl}
                      alt="bmp preview"
                      style={{ display: "block", maxHeight: "80px", maxWidth: "100%", imageRendering: "pixelated" }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 rounded border border-[#1a2a38] bg-[#060c10]">
                    <Icon name="ImageOff" size={12} className="text-[#2a4a5a]" />
                    <span className="text-[11px] font-['IBM_Plex_Mono'] text-[#2a4a5a]">BMP не найден — введи адрес вручную</span>
                  </div>
                )}
              </div>



              {bmpZoom && embeddedBmpUrl && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-zoom-out"
                  onClick={() => setBmpZoom(false)}
                >
                  <div className="flex flex-col items-center gap-4 p-4">
                    <div className="text-[10px] font-['IBM_Plex_Mono'] text-[#4a6a7a] tracking-widest uppercase">
                      BMP — {selectedEntry?.bmpAddress}
                    </div>
                    <div className="rounded border border-[#2a3a28] bg-black p-3 shadow-[0_0_40px_rgba(0,255,136,0.10)] max-w-[90vw] max-h-[80vh]">
                      <img
                        src={embeddedBmpUrl}
                        alt="bmp zoom"
                        style={{ display: "block", maxWidth: "90vw", maxHeight: "75vh", imageRendering: "pixelated" }}
                      />
                    </div>
                    <div className="text-xs font-['IBM_Plex_Mono'] text-[#2a5a4a]">нажми чтобы закрыть</div>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="text-[10px] font-['IBM_Plex_Mono'] text-[#4a6a7a] tracking-widest uppercase block mb-2">
                  Оригинал (японский)
                </label>
                <div className="px-3 py-2.5 rounded border border-[#1a2a38] bg-[#060c10] font-['IBM_Plex_Mono'] text-[#e8c87a] text-sm amber-glow">
                  {selectedEntry.original}
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-['IBM_Plex_Mono'] text-[#4a6a7a] tracking-widest uppercase">
                    Перевод (русский)
                  </label>
                  <button
                    onClick={handleAutoTranslate}
                    disabled={translating}
                    className="flex items-center gap-1.5 px-3 py-1 rounded border border-[#00ff88]/30 bg-[#00ff88]/8 text-[#00ff88] text-[11px] font-['IBM_Plex_Mono'] hover:bg-[#00ff88]/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {translating
                      ? <><Icon name="Loader" size={11} className="animate-spin" /> Перевожу...</>
                      : <><Icon name="Languages" size={11} /> Перевести</>
                    }
                  </button>
                </div>
                <input
                  value={selectedEntry.translated}
                  onChange={e => onUpdateTranslation(selectedEntry.id, e.target.value)}
                  placeholder="Введите перевод или нажмите «Перевести»..."
                  className="w-full px-3 py-2.5 rounded border border-[#1a3a2a] bg-[#060c10] text-white text-sm outline-none focus:border-[#00ff88]/40 focus:bg-[#061210] transition-colors placeholder-[#2a4a5a] font-['IBM_Plex_Mono']"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const idx = entries.findIndex(e => e.id === selectedEntry.id);
                    if (idx > 0) setSelectedId(entries[idx - 1].id);
                  }}
                  className="px-3 py-2 rounded border border-[#1a2a38] text-xs text-[#4a6a7a] hover:text-white hover:border-[#2a4a5a] transition-colors flex items-center gap-1"
                >
                  <Icon name="ChevronUp" size={12} /> Предыдущая
                </button>
                <button
                  onClick={() => {
                    const idx = entries.findIndex(e => e.id === selectedEntry.id);
                    if (idx < entries.length - 1) setSelectedId(entries[idx + 1].id);
                  }}
                  className="px-3 py-2 rounded border border-[#1a2a38] text-xs text-[#4a6a7a] hover:text-white hover:border-[#2a4a5a] transition-colors flex items-center gap-1"
                >
                  Следующая <Icon name="ChevronDown" size={12} />
                </button>
                <button
                  onClick={() => onUpdateTranslation(selectedEntry.id, "")}
                  className="px-3 py-2 rounded border border-[#3a1a1a] text-xs text-[#8a4a4a] hover:text-[#ff8888] transition-colors ml-auto flex items-center gap-1"
                >
                  <Icon name="Trash2" size={12} /> Очистить
                </button>
              </div>
            </div>

            {/* Hex preview */}
            <div className="p-4 rounded border border-[#1a2a38] bg-[#090f15]">
              <div className="text-[10px] font-['IBM_Plex_Mono'] text-[#2a5a6a] tracking-widest uppercase mb-2">HEX-ДАМП</div>
              <div className="font-['IBM_Plex_Mono'] text-[11px] text-[#4a8a6a] leading-relaxed">
                {Array.from(selectedEntry.original).map((ch, i) => (
                  <span key={i} className="mr-1">{ch.charCodeAt(0).toString(16).padStart(4, "0").toUpperCase()}</span>
                ))}
              </div>
              {selectedEntry.translated && (
                <>
                  <div className="h-px bg-[#1a2a38] my-2" />
                  <div className="font-['IBM_Plex_Mono'] text-[11px] text-[#4a7a8a] leading-relaxed">
                    {Array.from(selectedEntry.translated).map((ch, i) => (
                      <span key={i} className="mr-1">{ch.charCodeAt(0).toString(16).padStart(4, "0").toUpperCase()}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 rounded border border-dashed border-[#1a2a38] text-[#2a4a5a]">
            <Icon name="PenLine" size={32} className="mb-3 text-[#1a3a4a]" />
            <p className="text-sm">Выберите строку для редактирования</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}