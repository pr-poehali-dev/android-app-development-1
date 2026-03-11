import { useState, useEffect, useRef } from "react";

declare global {
  interface Window {
    ymaps: any;
  }
}

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  dotColor: string;
  dotRadius?: number;
}

interface Suggestion {
  value: string;
  displayName: string;
}

function shortenAddress(addr: string): string {
  if (!addr) return addr;
  let s = addr;
  s = s.replace(/Россия,?\s*/gi, "");
  s = s.replace(/Забайкальский край,?\s*/gi, "");
  s = s.replace(/Забайкальский\s+край,?\s*/gi, "");
  s = s.replace(/городской округ[^,]*,?\s*/gi, "");
  s = s.replace(/город\s+/gi, "");
  s = s.replace(/,\s*,/g, ",");
  s = s.replace(/^[\s,]+/, "").replace(/[\s,]+$/, "");
  return s;
}

export default function AddressInput({ value, onChange, placeholder, dotColor, dotRadius = 50 }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!value || value.length < 2 || !window.ymaps) {
      setSuggestions([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      const query = value.includes("Чита") ? value : `Чита, ${value}`;
      const res = await window.ymaps.suggest(query, {
        results: 7,
        boundedBy: [[51.85, 113.35], [52.15, 113.65]],
        strictBounds: true,
      }).catch(() => null);
      if (!res) return;
      const list: Suggestion[] = res.map((item: any) => ({
        value: shortenAddress(item.value),
        displayName: shortenAddress(item.displayName ?? item.value),
      }));
      const unique = list.filter((s, i, arr) => arr.findIndex(x => x.value === s.value) === i);
      setSuggestions(unique);
      setOpen(unique.length > 0);
    }, 300);
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (val: string) => {
    onChange(val);
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 9, height: 9, background: dotColor, borderRadius: dotRadius, zIndex: 1, flexShrink: 0 }} />
      <input
        className="taxi-input"
        style={{ paddingLeft: 34 }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100,
          background: "#1C1F2A", border: "1px solid var(--taxi-border)", borderRadius: 14,
          overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          maxHeight: 260, overflowY: "auto",
        }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onMouseDown={() => handleSelect(s.value)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "10px 14px", background: "none", border: "none",
                borderBottom: i < suggestions.length - 1 ? "1px solid var(--taxi-border)" : "none",
                color: "#F0F2F5", fontSize: 13, fontFamily: "Golos Text", cursor: "pointer",
                lineHeight: 1.4,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--taxi-surface)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              {s.displayName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { shortenAddress };
