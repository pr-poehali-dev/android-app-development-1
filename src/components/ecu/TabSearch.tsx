import Icon from "@/components/ui/icon";
import { LangEntry } from "./types";

type Props = {
  entries: LangEntry[];
  filteredEntries: LangEntry[];
  searchQuery: string;
  filterStatus: "all" | "pending" | "translated";
  selectedId: number | null;
  setSearchQuery: (q: string) => void;
  setFilterStatus: (f: "all" | "pending" | "translated") => void;
  onSelectEntry: (id: number) => void;
};

export default function TabSearch({
  entries,
  filteredEntries,
  searchQuery,
  filterStatus,
  selectedId,
  setSearchQuery,
  setFilterStatus,
  onSelectEntry,
}: Props) {
  const translatedCount = entries.filter(e => e.status === "translated").length;
  const total = entries.length;

  return (
    <div className="animate-slide-in-up">
      <div className="flex gap-2 mb-3">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded border border-[#1a2a38] bg-[#0a1218]">
          <Icon name="Search" size={14} className="text-[#4a6a7a]" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Поиск по адресу, тексту или переводу..."
            className="flex-1 bg-transparent text-sm text-white placeholder-[#2a4a5a] outline-none font-['IBM_Plex_Mono']"
          />
        </div>
        {(["all", "pending", "translated"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterStatus(f)}
            className={`px-3 py-2 rounded border text-xs font-['IBM_Plex_Mono'] transition-all ${
              filterStatus === f
                ? "border-[#00ff88]/30 text-[#00ff88] bg-[#00ff88]/5"
                : "border-[#1a2a38] text-[#4a6a7a] hover:text-[#8ab8c8]"
            }`}
          >
            {f === "all" ? "Все" : f === "pending" ? "Не переведено" : "Готово"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: "Найдено адресов", value: total, color: "#8ab8c8" },
          { label: "Переведено", value: translatedCount, color: "#00ff88" },
          { label: "Осталось", value: total - translatedCount, color: "#fbbf24" },
        ].map(s => (
          <div key={s.label} className="px-3 py-2 rounded border border-[#1a2a38] bg-[#0a1218] flex items-center justify-between">
            <span className="text-xs text-[#4a6a7a]">{s.label}</span>
            <span className="font-['IBM_Plex_Mono'] text-sm font-semibold" style={{ color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      <div className="rounded border border-[#1a2a38] overflow-hidden">
        <div className="grid grid-cols-[140px_1fr_1fr_80px_80px] text-xs font-['IBM_Plex_Mono'] text-[#2a5a6a] border-b border-[#1a2a38] bg-[#080f14] px-3 py-2">
          <span>АДРЕС</span>
          <span>ОРИГИНАЛ (JP)</span>
          <span>ПЕРЕВОД (RU)</span>
          <span className="text-center">БАЙТ</span>
          <span className="text-center">СТАТУС</span>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {filteredEntries.map((entry, i) => (
            <div
              key={entry.id}
              onClick={() => onSelectEntry(entry.id)}
              className={`grid grid-cols-[140px_1fr_1fr_80px_80px] px-3 py-2.5 border-b border-[#0d1e2a] cursor-pointer transition-colors items-center ${
                selectedId === entry.id ? "bg-[#00ff88]/5" : i % 2 === 0 ? "bg-[#090f15]" : "bg-[#080d12]"
              } hover:bg-[#0f2030]`}
            >
              <span className="font-['IBM_Plex_Mono'] text-xs text-[#00ff88]/70">{entry.address}</span>
              <span className="text-xs text-[#e8c87a] font-['IBM_Plex_Mono'] truncate pr-2">{entry.original}</span>
              <span className={`text-xs truncate pr-2 ${entry.translated ? "text-[#c8d8e8]" : "text-[#2a4a5a]"}`}>
                {entry.translated || "—"}
              </span>
              <span className="text-xs font-['IBM_Plex_Mono'] text-[#4a6a7a] text-center">{entry.bytes}</span>
              <div className="flex justify-center">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-['IBM_Plex_Mono'] ${
                  entry.status === "translated" ? "bg-[#00ff88]/10 text-[#00ff88]" : "bg-[#fbbf24]/10 text-[#fbbf24]"
                }`}>
                  {entry.status === "translated" ? "✓" : "?"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
