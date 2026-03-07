import Icon from "@/components/ui/icon";
import { DESCRIPTIONS, PersonDescription } from "@/lib/matrix";

type ResultSectionProps = {
  result: { life: number; character: number; destiny: number };
};

export default function ResultSection({ result }: ResultSectionProps) {
  const desc: PersonDescription = DESCRIPTIONS[result.life];
  if (!desc) return null;

  return (
    <section id="result-section" className="px-6 pb-20 max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-6"
          style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: "2px" }}>
          <Icon name="Sparkles" size={14} style={{ color: "#C9A84C" }} />
          <span className="font-golos text-xs tracking-widest uppercase" style={{ color: "#C9A84C" }}>Ваш результат</span>
        </div>
        <h2 className="font-cormorant text-4xl md:text-6xl font-light mb-2" style={{ color: "#F5D98B" }}>
          {desc.title}
        </h2>
        <p className="font-cormorant italic text-xl" style={{ color: "rgba(201,168,76,0.6)" }}>
          {desc.tagline}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: "Число жизненного пути", value: result.life, icon: "Compass", d: "Ваша главная миссия и потенциал" },
          { label: "Число характера", value: result.character, icon: "User", d: "Ваша истинная природа" },
          { label: "Число судьбы", value: result.destiny, icon: "Star", d: "Ваш жизненный вектор" },
        ].map(({ label, value, icon, d }) => (
          <div key={label} className="glass-card p-6 text-center" style={{ borderRadius: "6px" }}>
            <div className="w-12 h-12 number-circle flex items-center justify-center mx-auto mb-4">
              <Icon name={icon} size={20} style={{ color: "#C9A84C" }} />
            </div>
            <div className="font-cormorant text-6xl font-light mb-2" style={{ color: "#C9A84C" }}>{value}</div>
            <div className="font-golos text-sm font-medium mb-1" style={{ color: "#F5D98B" }}>{label}</div>
            <div className="font-golos text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{d}</div>
          </div>
        ))}
      </div>

      <div className="glass-card p-8 md:p-10 mb-6" style={{ borderRadius: "8px" }}>
        <h3 className="font-cormorant text-2xl mb-4" style={{ color: "#F5D98B" }}>Характеристика личности</h3>
        <p className="font-golos leading-relaxed" style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.8 }}>
          {desc.character}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="glass-card p-6" style={{ borderRadius: "6px" }}>
          <div className="flex items-center gap-2 mb-4">
            <Icon name="TrendingUp" size={16} style={{ color: "#C9A84C" }} />
            <h3 className="font-cormorant text-xl" style={{ color: "#F5D98B" }}>Сильные стороны</h3>
          </div>
          <ul className="space-y-2">
            {desc.strengths.map(s => (
              <li key={s} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#C9A84C" }} />
                <span className="font-golos text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-card p-6" style={{ borderRadius: "6px" }}>
          <div className="flex items-center gap-2 mb-4">
            <Icon name="AlertCircle" size={16} style={{ color: "rgba(201,168,76,0.6)" }} />
            <h3 className="font-cormorant text-xl" style={{ color: "#F5D98B" }}>Зоны роста</h3>
          </div>
          <ul className="space-y-2">
            {desc.challenges.map(c => (
              <li key={c} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "rgba(201,168,76,0.4)" }} />
                <span className="font-golos text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{c}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-card p-6" style={{ borderRadius: "6px" }}>
          <div className="flex items-center gap-2 mb-4">
            <Icon name="Briefcase" size={16} style={{ color: "#C9A84C" }} />
            <h3 className="font-cormorant text-xl" style={{ color: "#F5D98B" }}>Карьера и призвание</h3>
          </div>
          <p className="font-golos text-sm" style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>{desc.career}</p>
        </div>

        <div className="glass-card p-6" style={{ borderRadius: "6px" }}>
          <div className="flex items-center gap-2 mb-4">
            <Icon name="Heart" size={16} style={{ color: "#C9A84C" }} />
            <h3 className="font-cormorant text-xl" style={{ color: "#F5D98B" }}>Отношения</h3>
          </div>
          <p className="font-golos text-sm" style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>{desc.relationships}</p>
        </div>
      </div>

      <div className="glass-card p-8 text-center"
        style={{ borderRadius: "8px", background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.2)" }}>
        <div className="w-16 h-16 number-circle flex items-center justify-center mx-auto mb-4">
          <Icon name="Lock" size={24} style={{ color: "#C9A84C" }} />
        </div>
        <h3 className="font-cormorant text-2xl mb-2" style={{ color: "#F5D98B" }}>Получите полный анализ</h3>
        <p className="font-golos text-sm mb-6" style={{ color: "rgba(255,255,255,0.45)", maxWidth: "400px", margin: "0 auto 24px" }}>
          Жизненные циклы, энергия года, PDF-отчёт на 20 страниц, совместимость с партнёром
        </p>
        <button
          className="px-10 py-4 font-golos font-medium text-sm tracking-widest uppercase transition-all duration-300 hover:scale-105"
          style={{
            background: "linear-gradient(135deg, #8B6914, #C9A84C, #F5D98B)",
            color: "#080C1F",
            borderRadius: "3px",
            boxShadow: "0 8px 32px rgba(201,168,76,0.3)"
          }}
        >
          Получить полный анализ — 490 ₽
        </button>
      </div>
    </section>
  );
}
