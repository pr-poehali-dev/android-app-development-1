import { RefObject } from "react";
import Icon from "@/components/ui/icon";

type HeroSectionProps = {
  calcRef: RefObject<HTMLDivElement>;
};

export default function HeroSection({ calcRef }: HeroSectionProps) {
  return (
    <section className="min-h-screen flex items-center justify-center px-6 py-20 relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="https://cdn.poehali.dev/projects/160118d3-d90f-495c-ac4b-3eb880cb7af1/files/acb3c144-ac1a-40d9-9266-2cac05a463b5.jpg"
          alt="Матрица чисел"
          className="w-full h-full object-cover"
          style={{ opacity: 0.2 }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 0%, rgba(8,12,31,0.7) 60%, #080C1F 100%)" }} />
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 animate-fade-up opacity-0"
          style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: "2px" }}>
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#C9A84C" }} />
          <span className="font-golos text-xs tracking-widest uppercase" style={{ color: "#C9A84C" }}>
            Алгоритмический анализ личности
          </span>
        </div>

        <h1 className="font-cormorant font-light mb-6 animate-fade-up opacity-0 delay-100"
          style={{ fontSize: "clamp(3rem, 8vw, 6rem)", lineHeight: 1.05, color: "#F5D98B" }}>
          Матрица
          <br />
          <span className="font-cormorant italic" style={{ color: "#FFFFFF" }}>личности</span>
        </h1>

        <p className="font-golos text-lg md:text-xl mb-3 animate-fade-up opacity-0 delay-200"
          style={{ color: "rgba(245,217,139,0.6)", fontWeight: 300, letterSpacing: "0.02em" }}>
          Узнайте свой числовой код
        </p>
        <p className="font-golos mb-12 max-w-2xl mx-auto animate-fade-up opacity-0 delay-300"
          style={{ color: "rgba(255,255,255,0.45)", fontSize: "1rem", lineHeight: 1.7 }}>
          Алгоритмический анализ характера, потенциала и жизненных циклов по дате рождения.
          Основано на математических моделях и нумерологии Пифагора.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up opacity-0 delay-400">
          <button
            onClick={() => calcRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="px-8 py-4 font-golos font-medium text-sm tracking-widest uppercase transition-all duration-300 hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #8B6914, #C9A84C, #F5D98B)",
              color: "#080C1F",
              borderRadius: "3px",
              boxShadow: "0 8px 32px rgba(201,168,76,0.3)"
            }}
          >
            Рассчитать бесплатно
          </button>
          <button
            className="px-8 py-4 font-golos text-sm tracking-widest uppercase transition-all duration-300 hover:scale-105"
            style={{
              background: "transparent",
              color: "#C9A84C",
              border: "1px solid rgba(201,168,76,0.4)",
              borderRadius: "3px"
            }}
          >
            Узнать методологию
          </button>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto animate-fade-up opacity-0 delay-500">
          {[["50 000+", "расчётов"], ["98%", "точность"], ["9 типов", "личности"]].map(([val, label]) => (
            <div key={label} className="text-center">
              <div className="font-cormorant text-2xl md:text-3xl font-semibold mb-1" style={{ color: "#C9A84C" }}>{val}</div>
              <div className="font-golos text-xs" style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.05em" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <Icon name="ChevronDown" size={20} style={{ color: "rgba(201,168,76,0.4)" }} />
      </div>
    </section>
  );
}
