import Icon from "@/components/ui/icon";
import { LangEntry } from "./types";

type Props = {
  entries: LangEntry[];
  exportReady: boolean;
  setExportReady: (v: boolean) => void;
};

export default function TabPreview({ entries, exportReady, setExportReady }: Props) {
  const translatedCount = entries.filter(e => e.status === "translated").length;
  const total = entries.length;
  const pct = Math.round((translatedCount / total) * 100);

  return (
    <div className="animate-slide-in-up">
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Before */}
        <div className="rounded border border-[#1a2a38] overflow-hidden">
          <div className="px-3 py-2 bg-[#080f14] border-b border-[#1a2a38] flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#fbbf24]" />
            <span className="text-xs font-['IBM_Plex_Mono'] text-[#fbbf24] tracking-widest">ОРИГИНАЛ</span>
          </div>
          <div className="p-3 space-y-1 max-h-[400px] overflow-y-auto">
            {entries.map(e => (
              <div key={e.id} className="flex gap-3 py-1.5 border-b border-[#0d1e2a]">
                <span className="font-['IBM_Plex_Mono'] text-[10px] text-[#2a5a4a] w-20 shrink-0">{e.address.slice(0, 10)}</span>
                <span className="text-xs text-[#e8c87a] font-['IBM_Plex_Mono']">{e.original}</span>
              </div>
            ))}
          </div>
        </div>

        {/* After */}
        <div className="rounded border border-[#00ff88]/20 overflow-hidden">
          <div className="px-3 py-2 bg-[#061210] border-b border-[#00ff88]/20 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse-green" />
            <span className="text-xs font-['IBM_Plex_Mono'] text-[#00ff88] tracking-widest">ПОСЛЕ ПЕРЕВОДА</span>
          </div>
          <div className="p-3 space-y-1 max-h-[400px] overflow-y-auto">
            {entries.map(e => (
              <div key={e.id} className="flex gap-3 py-1.5 border-b border-[#0d1e2a] items-center">
                <span className="font-['IBM_Plex_Mono'] text-[10px] text-[#2a5a4a] w-20 shrink-0">{e.address.slice(0, 10)}</span>
                <span className={`text-xs font-['IBM_Plex_Mono'] ${e.translated ? "text-[#c8d8e8]" : "text-[#e8c87a] opacity-50"}`}>
                  {e.translated || e.original}
                </span>
                {!e.translated && (
                  <span className="text-[10px] text-[#fbbf24]/50 ml-auto shrink-0">[не переведено]</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export panel */}
      <div className="p-4 rounded border border-[#1a3a2a] bg-[#060f0a]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white mb-1">Готово к экспорту</p>
            <p className="text-xs text-[#4a6a7a]">
              Переведено{" "}
              <span className="text-[#00ff88] font-['IBM_Plex_Mono']">{translatedCount}</span>{" "}
              из{" "}
              <span className="text-[#8ab8c8] font-['IBM_Plex_Mono']">{total}</span>{" "}
              строк ({pct}%)
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setExportReady(true)}
              className="px-4 py-2 rounded border border-[#1a3a2a] text-xs text-[#4a6a7a] hover:text-white hover:border-[#2a5a3a] transition-colors font-['IBM_Plex_Mono'] flex items-center gap-2"
            >
              <Icon name="FileText" size={12} /> Экспорт CSV
            </button>
            <button
              onClick={() => setExportReady(true)}
              className="px-5 py-2 rounded bg-[#00ff88]/15 border border-[#00ff88]/30 text-[#00ff88] text-xs font-semibold hover:bg-[#00ff88]/25 transition-all font-['IBM_Plex_Mono'] flex items-center gap-2"
            >
              <Icon name="Download" size={13} />
              Залить в дамп
            </button>
          </div>
        </div>
        {exportReady && (
          <div className="mt-3 flex items-center gap-2 text-xs text-[#00ff88] font-['IBM_Plex_Mono'] animate-slide-in-up">
            <Icon name="CheckCircle" size={14} />
            Файл подготовлен. В полной версии здесь будет реальная запись перевода в бинарный дамп.
          </div>
        )}
      </div>
    </div>
  );
}
