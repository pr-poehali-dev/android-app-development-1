import { useState } from "react";
import Icon from "@/components/ui/icon";
import { UserRole, User } from "./types";

interface Props {
  onAuth: (user: User) => void;
}

const ROLES = [
  { id: "passenger" as UserRole, label: "Пассажир", icon: "👤", desc: "Заказать поездку" },
  { id: "driver" as UserRole, label: "Водитель", icon: "🚗", desc: "Принимать заказы" },
  { id: "admin" as UserRole, label: "Администратор", icon: "⚙️", desc: "Управление системой" },
];

export default function AuthScreen({ onAuth }: Props) {
  const [step, setStep] = useState<"role" | "phone" | "code" | "admin">("role");
  const [role, setRole] = useState<UserRole>("passenger");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState(["", "", "", ""]);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleRoleSelect = (r: UserRole) => {
    setRole(r);
    if (r === "admin") setStep("admin");
    else setStep("phone");
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
        onAuth({ id: `u_${Date.now()}`, name: role === "driver" ? "Алексей Козлов" : "Иван Петров", phone: `+7 ${phone}`, role });
      }, 400);
    }
  };

  const handleAdminLogin = () => {
    if (login === "admin" && password === "admin75Reg") {
      onAuth({ id: "admin_1", name: "Администратор", phone: "", role: "admin" });
    } else {
      setAdminError("Неверный логин или пароль");
      setTimeout(() => setAdminError(""), 3000);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: "100%", background: "var(--taxi-dark)" }}>
      <div className="map-bg relative flex-1 flex items-center justify-center" style={{ minHeight: 200 }}>
        <div className="map-road" style={{ width: 2, height: "100%", left: "30%", top: 0, opacity: 0.4 }} />
        <div className="map-road" style={{ width: 2, height: "100%", left: "70%", top: 0, opacity: 0.3 }} />
        <div className="map-road" style={{ height: 2, width: "100%", top: "40%", left: 0, opacity: 0.4 }} />
        <div className="map-road" style={{ height: 2, width: "100%", top: "70%", left: 0, opacity: 0.3 }} />
        <div className="flex flex-col items-center gap-3 animate-fade-slide-up" style={{ zIndex: 1 }}>
          <div className="animate-pulse-glow" style={{ width: 60, height: 60, background: "var(--taxi-yellow)", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 28 }}>🚖</span>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "Montserrat", fontWeight: 900, fontSize: 24, color: "#F0F2F5" }}>
              TAXI<span style={{ color: "var(--taxi-yellow)" }}>GO</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--taxi-muted)", marginTop: 2 }}>Быстро. Надёжно. Везде.</div>
          </div>
        </div>
        <div className="animate-car absolute" style={{ bottom: 12, fontSize: 22 }}>🚕</div>
      </div>

      <div className="bottom-sheet animate-fade-slide-up animate-delay-200" style={{ paddingTop: 20 }}>
        {step === "role" && (
          <>
            <h2 style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 20, color: "#F0F2F5", marginBottom: 14 }}>Выберите роль</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ROLES.map((r) => (
                <button key={r.id} onClick={() => handleRoleSelect(r.id)}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "var(--taxi-surface)", border: "1px solid var(--taxi-border)", borderRadius: 16, cursor: "pointer", textAlign: "left", transition: "border-color 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--taxi-yellow)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--taxi-border)")}>
                  <div style={{ width: 44, height: 44, background: "var(--taxi-card)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{r.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 15, color: "#F0F2F5" }}>{r.label}</div>
                    <div style={{ fontSize: 12, color: "var(--taxi-muted)", marginTop: 2 }}>{r.desc}</div>
                  </div>
                  <Icon name="ChevronRight" size={18} color="var(--taxi-muted)" fallback="ArrowRight" />
                </button>
              ))}
            </div>
          </>
        )}

        {step === "phone" && (
          <>
            <button onClick={() => setStep("role")} style={{ background: "none", border: "none", color: "var(--taxi-yellow)", fontSize: 13, cursor: "pointer", padding: "0 0 14px", display: "flex", alignItems: "center", gap: 6, fontFamily: "Golos Text" }}>
              <Icon name="ArrowLeft" size={15} /> Назад
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 34, height: 34, background: "var(--taxi-yellow)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                {ROLES.find((r) => r.id === role)?.icon}
              </div>
              <h2 style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 18, color: "#F0F2F5" }}>
                Вход как {ROLES.find((r) => r.id === role)?.label}
              </h2>
            </div>
            <p style={{ fontSize: 13, color: "var(--taxi-muted)", marginBottom: 16 }}>Введите номер телефона</p>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#F0F2F5", fontWeight: 600, fontSize: 15, zIndex: 1 }}>+7</div>
              <input className="taxi-input" style={{ paddingLeft: 44 }} placeholder="(999) 000-00-00" type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} maxLength={10} />
            </div>
            <p style={{ fontSize: 12, color: "var(--taxi-muted)", marginBottom: 16, lineHeight: 1.5 }}>
              Нажимая кнопку, вы принимаете <span style={{ color: "var(--taxi-yellow)" }}>условия соглашения</span>
            </p>
            <button className="btn-yellow" onClick={handlePhoneNext}>Получить код →</button>
          </>
        )}

        {step === "code" && (
          <>
            <button onClick={() => setStep("phone")} style={{ background: "none", border: "none", color: "var(--taxi-yellow)", fontSize: 13, cursor: "pointer", padding: "0 0 14px", display: "flex", alignItems: "center", gap: 6, fontFamily: "Golos Text" }}>
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
            <button className="btn-yellow" onClick={() => onAuth({ id: `u_${Date.now()}`, name: role === "driver" ? "Алексей Козлов" : "Иван Петров", phone: `+7 ${phone}`, role })}>
              Подтвердить
            </button>
            <div style={{ textAlign: "center", marginTop: 14 }}>
              <span style={{ fontSize: 12, color: "var(--taxi-muted)" }}>Не пришёл код? </span>
              <span style={{ fontSize: 12, color: "var(--taxi-yellow)", cursor: "pointer" }}>Отправить ещё раз</span>
            </div>
          </>
        )}

        {step === "admin" && (
          <>
            <button onClick={() => setStep("role")} style={{ background: "none", border: "none", color: "var(--taxi-yellow)", fontSize: 13, cursor: "pointer", padding: "0 0 14px", display: "flex", alignItems: "center", gap: 6, fontFamily: "Golos Text" }}>
              <Icon name="ArrowLeft" size={15} /> Назад
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, background: "var(--taxi-surface)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>⚙️</div>
              <h2 style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 18, color: "#F0F2F5" }}>Вход администратора</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
              <input className="taxi-input" placeholder="Логин" value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="off" />
              <div style={{ position: "relative" }}>
                <input className="taxi-input" placeholder="Пароль" type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()} style={{ paddingRight: 48 }} />
                <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--taxi-muted)" }}>
                  <Icon name={showPass ? "EyeOff" : "Eye"} size={18} fallback="Eye" />
                </button>
              </div>
            </div>
            {adminError && (
              <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, fontSize: 13, color: "var(--taxi-red)", marginBottom: 12 }}>
                {adminError}
              </div>
            )}
            <button className="btn-yellow" onClick={handleAdminLogin}>Войти в панель</button>
          </>
        )}
      </div>
    </div>
  );
}
