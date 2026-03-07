import { RefObject } from "react";

type CalcSectionProps = {
  calcRef: RefObject<HTMLDivElement>;
  calcVisible: boolean;
  birthDate: string;
  birthTime: string;
  onBirthDateChange: (v: string) => void;
  onBirthTimeChange: (v: string) => void;
  onCalculate: () => void;
};

export default function CalcSection({
  calcRef,
  calcVisible,
  birthDate,
  birthTime,
  onBirthDateChange,
  onBirthTimeChange,
  onCalculate,
}: CalcSectionProps) {
  return (
    <section ref={calcRef} className="px-6 py-20 max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <span className="font-golos text-xs tracking-widest uppercase mb-3 block" style={{ color: "#C9A84C" }}>
          Персональный расчёт
        </span>
        <h2 className="font-cormorant text-4xl md:text-5xl font-light mb-4" style={{ color: "#F5D98B" }}>
          Ваш числовой код
        </h2>
        <p className="font-golos" style={{ color: "rgba(255,255,255,0.4)", maxWidth: "500px", margin: "0 auto", lineHeight: 1.7 }}>
          Введите дату рождения — алгоритм рассчитает ваш уникальный числовой профиль
        </p>
      </div>

      <div
        className="max-w-2xl mx-auto glass-card p-8 md:p-12 transition-all duration-1000"
        style={{
          borderRadius: "8px",
          opacity: calcVisible ? 1 : 0,
          transform: calcVisible ? "translateY(0)" : "translateY(3rem)"
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="font-golos text-xs tracking-widest uppercase mb-3 block" style={{ color: "rgba(201,168,76,0.7)" }}>
              Дата рождения *
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={e => onBirthDateChange(e.target.value)}
              className="w-full px-4 py-3 font-golos text-sm outline-none"
              style={{
                background: "rgba(8,12,31,0.8)",
                border: "1px solid rgba(201,168,76,0.25)",
                borderRadius: "4px",
                color: "#F5D98B",
                colorScheme: "dark"
              }}
            />
          </div>
          <div>
            <label className="font-golos text-xs tracking-widest uppercase mb-3 block" style={{ color: "rgba(201,168,76,0.7)" }}>
              Время рождения (необязательно)
            </label>
            <input
              type="time"
              value={birthTime}
              onChange={e => onBirthTimeChange(e.target.value)}
              className="w-full px-4 py-3 font-golos text-sm outline-none"
              style={{
                background: "rgba(8,12,31,0.8)",
                border: "1px solid rgba(201,168,76,0.15)",
                borderRadius: "4px",
                color: "rgba(245,217,139,0.6)",
                colorScheme: "dark"
              }}
            />
          </div>
        </div>

        <button
          onClick={onCalculate}
          disabled={!birthDate}
          className="w-full py-4 font-golos font-medium text-sm tracking-widest uppercase transition-all duration-300"
          style={{
            background: birthDate ? "linear-gradient(135deg, #8B6914, #C9A84C, #F5D98B)" : "rgba(201,168,76,0.15)",
            color: birthDate ? "#080C1F" : "rgba(201,168,76,0.4)",
            borderRadius: "4px",
            boxShadow: birthDate ? "0 8px 32px rgba(201,168,76,0.25)" : "none",
            cursor: birthDate ? "pointer" : "not-allowed"
          }}
        >
          Рассчитать матрицу личности
        </button>

        <p className="text-center mt-4 font-golos text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
          Базовый расчёт — бесплатно · Полный анализ — после регистрации
        </p>
      </div>
    </section>
  );
}
