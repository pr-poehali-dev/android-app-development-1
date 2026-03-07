export default function Footer() {
  return (
    <footer className="px-6 py-10" style={{ borderTop: "1px solid rgba(201,168,76,0.1)" }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 number-circle flex items-center justify-center">
            <span className="font-cormorant text-base font-bold" style={{ color: "#C9A84C" }}>М</span>
          </div>
          <span className="font-cormorant text-lg" style={{ color: "#F5D98B", letterSpacing: "0.05em" }}>Матрица личности</span>
        </div>
        <div className="flex gap-6 flex-wrap justify-center">
          {["Главная", "Методология", "Блог", "Контакты", "Политика конфиденциальности"].map(item => (
            <a key={item} href="#" className="font-golos text-xs transition-colors hover:text-gold"
              style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.03em" }}>
              {item}
            </a>
          ))}
        </div>
        <div className="font-golos text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
          © 2024 personmatrix.ru
        </div>
      </div>
    </footer>
  );
}
