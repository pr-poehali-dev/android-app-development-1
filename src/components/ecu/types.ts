export type LangEntry = {
  id: number;
  address: string;
  original: string;
  translated: string;
  bytes: number;
  status: "pending" | "translated" | "skipped";
  bmpAddress?: string;  // адрес bitmap данных в прошивке (виртуальный)
  bmpWidth?: number;    // ширина в пикселях (авто-определена)
  bmpHeight?: number;   // высота в пикселях (авто-определена)
};

export type Tab = "search" | "editor" | "preview" | "explorer";
export type ScanMode = "sjis" | "utf16le" | "utf16be" | "utf8" | "all";

export const DEMO_ENTRIES: LangEntry[] = [
  { id: 1, address: "0x0001A4F2", original: "エンジン警告", translated: "Предупреждение двигателя", bytes: 14, status: "translated" },
  { id: 2, address: "0x0001A500", original: "燃料残量低", translated: "Низкий уровень топлива", bytes: 10, status: "translated" },
  { id: 3, address: "0x0001A510", original: "オイル交換", translated: "Замена масла", bytes: 10, status: "translated" },
  { id: 4, address: "0x0001A51E", original: "タイヤ空気圧", translated: "", bytes: 12, status: "pending" },
  { id: 5, address: "0x0001A52A", original: "ドア開警告", translated: "", bytes: 12, status: "pending" },
  { id: 6, address: "0x0001A538", original: "シートベルト", translated: "", bytes: 14, status: "pending" },
  { id: 7, address: "0x0001A548", original: "バッテリー低下", translated: "Низкий заряд АКБ", bytes: 14, status: "translated" },
  { id: 8, address: "0x0001A558", original: "速度制限", translated: "", bytes: 8, status: "pending" },
  { id: 9, address: "0x0001A562", original: "ブレーキ警告", translated: "Предупреждение тормозов", bytes: 14, status: "translated" },
  { id: 10, address: "0x0001A572", original: "冷却水温度", translated: "", bytes: 10, status: "pending" },
];