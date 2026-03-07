import { useState } from "react";
import Icon from "@/components/ui/icon";

const navItems = ["Главная", "Калькулятор", "Анализ", "Совместимость", "Методология"];

export default function Navbar() {
  const [activeNav, setActiveNav] = useState("Главная");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50" style={{ background: "rgba(8,12,31,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(201,168,76,0.1)" }}>
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 number-circle flex items-center justify-center">
            <span className="font-cormorant text-lg font-bold" style={{ color: "#C9A84C" }}>М</span>
          </div>
          <span className="font-cormorant text-xl font-semibold" style={{ color: "#F5D98B", letterSpacing: "0.05em" }}>
            Матрица личности
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {navItems.map(item => (
            <button
              key={item}
              onClick={() => setActiveNav(item)}
              className="font-golos text-sm transition-all duration-300"
              style={{ color: activeNav === item ? "#C9A84C" : "rgba(245,217,139,0.5)", letterSpacing: "0.03em" }}
            >
              {item}
            </button>
          ))}
        </div>
        <button
          className="hidden md:block px-5 py-2 font-golos text-sm font-medium transition-all duration-300 hover:scale-105"
          style={{
            background: "linear-gradient(135deg, #8B6914, #C9A84C, #F5D98B)",
            color: "#080C1F",
            borderRadius: "4px",
            letterSpacing: "0.05em"
          }}
        >
          Войти
        </button>
        <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} style={{ color: "#C9A84C" }}>
          <Icon name={menuOpen ? "X" : "Menu"} size={22} />
        </button>
      </div>
      {menuOpen && (
        <div className="md:hidden px-6 pb-4 flex flex-col gap-4" style={{ borderTop: "1px solid rgba(201,168,76,0.1)" }}>
          {navItems.map(item => (
            <button key={item} onClick={() => { setActiveNav(item); setMenuOpen(false); }}
              className="font-golos text-sm text-left py-1" style={{ color: "rgba(245,217,139,0.7)" }}>
              {item}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}
