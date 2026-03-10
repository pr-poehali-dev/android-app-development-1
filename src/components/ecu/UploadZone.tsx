import { useRef } from "react";
import Icon from "@/components/ui/icon";
import { ScanMode } from "./types";

type Props = {
  scanning: boolean;
  scanProgress: number;
  scanLog: string[];
  scanMode: ScanMode;
  minLen: number;
  setScanMode: (m: ScanMode) => void;
  setMinLen: (n: number) => void;
  onFileLoad: (file: File) => void;
};

export default function UploadZone({
  scanning,
  scanProgress,
  scanLog,
  scanMode,
  minLen,
  setScanMode,
  setMinLen,
  onFileLoad,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onFileLoad(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileLoad(file);
  };

  if (scanning) {
    return (
      <div className="mb-6 p-4 rounded border border-[#00ff88]/20 bg-[#00ff88]/5 animate-slide-in-up">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-2 bg-[#00ff88] rounded-full animate-blink" />
          <span className="text-sm font-['IBM_Plex_Mono'] text-[#00ff88]">СКАНИРОВАНИЕ ДАМПА... {Math.round(scanProgress)}%</span>
        </div>
        <div className="h-1.5 bg-[#0d1f17] rounded-full overflow-hidden mb-3">
          <div className="progress-bar h-full rounded-full transition-all duration-200" style={{ width: `${scanProgress}%` }} />
        </div>
        <div className="space-y-0.5">
          {scanLog.map((line, i) => (
            <div key={i} className="font-['IBM_Plex_Mono'] text-[11px] text-[#4a8a6a]">▸ {line}</div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-in-up" style={{ animationDelay: "0.1s" }}>
      <div className="mb-4 p-4 rounded border border-[#1a2a38] bg-[#090f15]">
        <div className="text-[10px] font-['IBM_Plex_Mono'] text-[#2a5a6a] tracking-widest uppercase mb-3">ПАРАМЕТРЫ СКАНИРОВАНИЯ</div>
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="text-xs text-[#4a6a7a] block mb-1.5">Кодировка</label>
            <div className="flex gap-1">
              {(["all", "sjis", "utf16le", "utf16be", "utf8"] as ScanMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setScanMode(m)}
                  className={`px-2.5 py-1 rounded text-[11px] font-['IBM_Plex_Mono'] border transition-all ${
                    scanMode === m
                      ? "border-[#00ff88]/40 text-[#00ff88] bg-[#00ff88]/8"
                      : "border-[#1a2a38] text-[#4a6a7a] hover:text-[#8ab8c8]"
                  }`}
                >
                  {m === "all" ? "ВСЕ" : m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-[#4a6a7a] block mb-1.5">Мин. длина строки</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  onClick={() => setMinLen(n)}
                  className={`w-8 h-7 rounded text-[11px] font-['IBM_Plex_Mono'] border transition-all ${
                    minLen === n
                      ? "border-[#00ff88]/40 text-[#00ff88] bg-[#00ff88]/8"
                      : "border-[#1a2a38] text-[#4a6a7a] hover:text-[#8ab8c8]"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className="border-2 border-dashed border-[#1a3a2a] rounded-lg p-12 text-center cursor-pointer hover:border-[#00ff88]/40 hover:bg-[#00ff88]/3 transition-all duration-300"
        onDragOver={e => e.preventDefault()}
        onDrop={handleFileDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" className="hidden" accept=".bin,.hex,.rom,.dump,.bmp,image/bmp" onChange={handleFileSelect} />
        <Icon name="Upload" size={36} className="text-[#1a5a3a] mx-auto mb-3" />
        <p className="text-sm text-[#4a6a7a] mb-1">Перетащите файл дампа сюда или нажмите</p>
        <p className="text-xs text-[#2a4a3a] font-['IBM_Plex_Mono']">.bin · .hex · .rom · .dump · .bmp · любой формат</p>
      </div>
    </div>
  );
}