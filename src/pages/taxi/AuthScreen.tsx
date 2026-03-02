import { useState } from "react";
import Icon from "@/components/ui/icon";
import { UserRole, User, Driver, LOGO_URL } from "./types";

interface Props {
  onAuth: (user: User) => void;
  drivers: Driver[];
}

type AuthTab = "passenger" | "driver" | "admin";

export default function AuthScreen({ onAuth, drivers }: Props) {
  const [activeTab, setActiveTab] = useState<AuthTab>("passenger");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"input" | "code">("input");
  const [code, setCode] = useState(["", "", "", ""]);
  const [driverLogin, setDriverLogin] = useState("");
  const [driverPassword, setDriverPassword] = useState("");
  const [adminLogin, setAdminLogin] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showDriverPass, setShowDriverPass] = useState(false);
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [error, setError] = useState("");

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(""), 3000);
  };

  const handlePhoneNext = () => {
    if (phone.length >= 10) setStep("code");
  };

  const handleCodeChange = (val: string, idx: number) => {
    const next = [...code];
    next[idx] = val.slice(-1);
    setCode(next);
    if (val && idx < 3) {
      const inputs = document.querySelectorAll<HTMLInputElement>(".code-input");
      inputs[idx + 1]?.focus();
    }
    if (next.every((d) => d !== "") && idx === 3) {
      setTimeout(() => {
        onAuth({ id: `u_${Date.now()}`, name: "Пассажир", phone: `+7 ${phone}`, role: "passenger" });
      }, 400);
    }
  };

  const handleDriverLogin = () => {
    const found = drivers.find((d) => d.login === driverLogin && d.password === driverPassword);
    if (found) {
      onAuth({ id: found.id, name: found.name, phone: found.phone, role: "driver" });
    } else {
      showError("Неверный логин или пароль");
    }
  };

  const handleAdminLogin = () => {
    if (adminLogin === "admin" && adminPassword === "admin75reg") {
      onAuth({ id: "admin_1", name: "Администратор", phone: "", role: "admin" });
    } else {
      showError("Неверный логин или пароль");
    }
  };

  const TABS: { id: AuthTab; label: string; icon: string }[] = [
    { id: "passenger", label: "Пассажир", icon: "👤" },
    { id: "driver", label: "Водитель", icon: "🚗" },
    { id: "admin", label: "Админ", icon: "⚙️" },
  ];

  const resetState = () => {
    setPhone(""); setStep("input"); setCode(["", "", "", ""]);
    setDriverLogin(""); setDriverPassword("");
    setAdminLogin(""); setAdminPassword("");
    setError("");
  };

  return (
    <div className="flex flex-col" style={{ height: "100%", background: "var(--taxi-dark)" }}>
      <div className="map-bg relative flex-1 flex items-center justify-center" style={{ minHeight: 180 }}>
        <div className="map-road" style={{ width: 2, height: "100%", left: "30%", top: 0, opacity: 0.4 }} />
        <div className="map-road" style={{ width: 2, height: "100%", left: "70%", top: 0, opacity: 0.3 }} />
        <div className="map-road" style={{ height: 2, width: "100%", top: "40%", left: 0, opacity: 0.4 }} />
        <div className="map-road" style={{ height: 2, width: "100%", top: "70%", left: 0, opacity: 0.3 }} />
        <div className="flex flex-col items-center gap-3 animate-fade-slide-up" style={{ zIndex: 1 }}>
          <div className="animate-pulse-glow" style={{ width: 72, height: 72, borderRadius: 22, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src={LOGO_URL} alt="Sovyonok Tax" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 22 }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "Montserrat", fontWeight: 900, fontSize: 22, color: "#F0F2F5" }}>
              Sovyonok <span style={{ color: "var(--taxi-yellow)" }}>Tax</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--taxi-muted)", marginTop: 2 }}>Быстро. Надёжно. Безопасно.</div>
          </div>
        </div>
        <div className="animate-car absolute" style={{ bottom: 12, fontSize: 22 }}>🚕</div>
      </div>

      <div className="bottom-sheet animate-fade-slide-up animate-delay-200" style={{ paddingTop: 16 }}>
        <div style={{ display: "flex", background: "var(--taxi-surface)", borderRadius: 14, padding: 3, marginBottom: 18 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); resetState(); }}
              style={{
                flex: 1, padding: "10px 6px", border: "none", borderRadius: 11, cursor: "pointer",
                background: activeTab === t.id ? "var(--taxi-yellow)" : "transparent",
                color: activeTab === t.id ? "var(--taxi-dark)" : "var(--taxi-muted)",
                fontFamily: "Montserrat", fontWeight: 700, fontSize: 12, transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              }}
            >
              <span style={{ fontSize: 14 }}>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.15)", border: "1px solid var(--taxi-red)", borderRadius: 12,
            padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "var(--taxi-red)", textAlign: "center",
          }}>{error}</div>
        )}

        {activeTab === "passenger" && step === "input" && (
          <>
            <h2 style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 18, color: "#F0F2F5", marginBottom: 4 }}>Вход для пассажира</h2>
            <p style={{ fontSize: 13, color: "var(--taxi-muted)", marginBottom: 16 }}>Введите номер телефона</p>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#F0F2F5", fontWeight: 600, fontSize: 15, zIndex: 1 }}>+7</div>
              <input className="taxi-input" style={{ paddingLeft: 44 }} placeholder="(999) 000-00-00" type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} maxLength={10} />
            </div>
            <p style={{ fontSize: 12, color: "var(--taxi-muted)", marginBottom: 16, lineHeight: 1.5 }}>
              Нажимая кнопку, вы принимаете <span style={{ color: "var(--taxi-yellow)" }}>условия соглашения</span>
            </p>
            <button className="btn-yellow" onClick={handlePhoneNext} disabled={phone.length < 10} style={{ opacity: phone.length < 10 ? 0.5 : 1 }}>
              Получить код
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, justifyContent: "center" }}>
              <Icon name="ShieldCheck" size={14} color="var(--taxi-green)" fallback="Shield" />
              <span style={{ fontSize: 11, color: "var(--taxi-muted)" }}>End-to-end шифрование</span>
            </div>
          </>
        )}

        {activeTab === "passenger" && step === "code" && (
          <>
            <button onClick={() => setStep("input")} style={{ background: "none", border: "none", color: "var(--taxi-yellow)", fontSize: 13, cursor: "pointer", padding: "0 0 14px", display: "flex", alignItems: "center", gap: 6, fontFamily: "Golos Text" }}>
              <Icon name="ArrowLeft" size={15} /> Назад
            </button>
            <h2 style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 20, color: "#F0F2F5", marginBottom: 4 }}>Введите код</h2>
            <p style={{ fontSize: 13, color: "var(--taxi-muted)", marginBottom: 22 }}>Отправили SMS на +7 {phone}</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 22 }}>
              {code.map((d, i) => (
                <input key={i} className="code-input" value={d} onChange={(e) => handleCodeChange(e.target.value, i)} maxLength={1} type="text" inputMode="numeric"
                  style={{ width: 60, height: 60, background: d ? "var(--taxi-yellow)" : "var(--taxi-surface)", border: `2px solid ${d ? "var(--taxi-yellow)" : "var(--taxi-border)"}`, borderRadius: 16, textAlign: "center", fontSize: 22, fontWeight: 700, color: d ? "var(--taxi-dark)" : "#F0F2F5", outline: "none", transition: "all 0.2s", fontFamily: "Montserrat" }} />
              ))}
            </div>
            <button className="btn-yellow" onClick={() => onAuth({ id: `u_${Date.now()}`, name: "Пассажир", phone: `+7 ${phone}`, role: "passenger" })}>
              Подтвердить
            </button>
            <div style={{ textAlign: "center", marginTop: 14 }}>
              <span style={{ fontSize: 12, color: "var(--taxi-muted)" }}>Не пришёл код? </span>
              <span style={{ fontSize: 12, color: "var(--taxi-yellow)", cursor: "pointer" }}>Отправить ещё раз</span>
            </div>
          </>
        )}

        {activeTab === "driver" && (
          <>
            <h2 style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 18, color: "#F0F2F5", marginBottom: 4 }}>Вход для водителя</h2>
            <p style={{ fontSize: 13, color: "var(--taxi-muted)", marginBottom: 16 }}>Используйте логин и пароль от администратора</p>
            <input className="taxi-input" placeholder="Логин" value={driverLogin} onChange={(e) => setDriverLogin(e.target.value)} style={{ marginBottom: 10 }} />
            <div style={{ position: "relative", marginBottom: 16 }}>
              <input className="taxi-input" placeholder="Пароль" type={showDriverPass ? "text" : "password"} value={driverPassword} onChange={(e) => setDriverPassword(e.target.value)} style={{ paddingRight: 48 }} />
              <button onClick={() => setShowDriverPass(!showDriverPass)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--taxi-muted)" }}>
                <Icon name={showDriverPass ? "EyeOff" : "Eye"} size={18} fallback="Eye" />
              </button>
            </div>
            <button className="btn-yellow" onClick={handleDriverLogin} disabled={!driverLogin || !driverPassword} style={{ opacity: !driverLogin || !driverPassword ? 0.5 : 1 }}>
              Войти
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, justifyContent: "center" }}>
              <Icon name="ShieldCheck" size={14} color="var(--taxi-green)" fallback="Shield" />
              <span style={{ fontSize: 11, color: "var(--taxi-muted)" }}>End-to-end шифрование</span>
            </div>
          </>
        )}

        {activeTab === "admin" && (
          <>
            <h2 style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 18, color: "#F0F2F5", marginBottom: 4 }}>Вход администратора</h2>
            <p style={{ fontSize: 13, color: "var(--taxi-muted)", marginBottom: 16 }}>Доступ только для авторизованных сотрудников</p>
            <input className="taxi-input" placeholder="Логин" value={adminLogin} onChange={(e) => setAdminLogin(e.target.value)} style={{ marginBottom: 10 }} />
            <div style={{ position: "relative", marginBottom: 16 }}>
              <input className="taxi-input" placeholder="Пароль" type={showAdminPass ? "text" : "password"} value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} style={{ paddingRight: 48 }}
                onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()} />
              <button onClick={() => setShowAdminPass(!showAdminPass)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--taxi-muted)" }}>
                <Icon name={showAdminPass ? "EyeOff" : "Eye"} size={18} fallback="Eye" />
              </button>
            </div>
            <button className="btn-yellow" onClick={handleAdminLogin} disabled={!adminLogin || !adminPassword} style={{ opacity: !adminLogin || !adminPassword ? 0.5 : 1 }}>
              Войти
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, justifyContent: "center" }}>
              <Icon name="Lock" size={14} color="var(--taxi-green)" fallback="Shield" />
              <span style={{ fontSize: 11, color: "var(--taxi-muted)" }}>Защищённое соединение</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
