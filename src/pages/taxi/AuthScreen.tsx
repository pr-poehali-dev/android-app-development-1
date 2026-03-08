import { useState } from "react";
import Icon from "@/components/ui/icon";
import { User, Driver, AppSettings, LOGO_URL } from "./types";
import { saveSession } from "./notifications";
import AgreementScreen from "./AgreementScreen";
import api from "./api";

interface Props {
  onAuth: (user: User) => void;
  drivers: Driver[];
  settings: AppSettings;
}

type Screen = "welcome" | "passenger" | "driver" | "admin";

export default function AuthScreen({ onAuth, drivers, settings }: Props) {
  const [screen, setScreen] = useState<Screen>("welcome");
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
  const [showAgreement, setShowAgreement] = useState(false);

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(""), 3000);
  };

  const handlePhoneNext = () => {
    if (phone.length >= 10) setStep("code");
  };

  const [passengerLoading, setPassengerLoading] = useState(false);

  const registerPassenger = async () => {
    if (passengerLoading) return;
    setPassengerLoading(true);
    const u: User = { id: `u_${Date.now()}`, name: "Пассажир", phone: `+7${phone}`, role: "passenger" };
    const res = await api.authPassenger({ id: u.id, name: u.name, phone: u.phone });
    setPassengerLoading(false);
    if (res && res.id && !res.error) {
      saveSession({ userId: res.id, role: "passenger", name: res.name, phone: res.phone });
      onAuth({ id: res.id, name: res.name, phone: res.phone, role: "passenger" });
    } else {
      saveSession({ userId: u.id, role: u.role, name: u.name, phone: u.phone });
      onAuth(u);
    }
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
      setTimeout(() => registerPassenger(), 400);
    }
  };

  const [driverLoading, setDriverLoading] = useState(false);

  const handleDriverLogin = async () => {
    if (driverLoading) return;
    setDriverLoading(true);
    const res = await api.authDriver({ login: driverLogin, password: driverPassword });
    setDriverLoading(false);
    if (res && res.id && !res.error) {
      saveSession({ userId: res.id, role: "driver", name: res.name, phone: res.phone, driverLogin: driverLogin });
      onAuth({ id: res.id, name: res.name, phone: res.phone, role: "driver" });
    } else {
      const found = drivers.find((d) => d.login === driverLogin && d.password === driverPassword);
      if (found) {
        saveSession({ userId: found.id, role: "driver", name: found.name, phone: found.phone, driverLogin: found.login });
        onAuth({ id: found.id, name: found.name, phone: found.phone, role: "driver" });
      } else {
        showError("Неверный логин или пароль");
      }
    }
  };

  const [adminLoading, setAdminLoading] = useState(false);

  const handleAdminLogin = async () => {
    if (adminLoading) return;
    setAdminLoading(true);
    const res = await api.authAdmin({ login: adminLogin, password: adminPassword });
    setAdminLoading(false);
    if (res && res.id && !res.error) {
      const u: User = { id: res.id, name: res.name, phone: res.phone || "", role: "admin" };
      saveSession({ userId: u.id, role: u.role, name: u.name, phone: u.phone });
      onAuth(u);
    } else {
      if (adminLogin === "admin" && adminPassword === settings.adminPassword) {
        const u: User = { id: "admin_1", name: "Администратор", phone: "", role: "admin" };
        saveSession({ userId: u.id, role: u.role, name: u.name, phone: u.phone });
        onAuth(u);
      } else {
        showError("Неверный логин или пароль");
      }
    }
  };

  const goBack = () => {
    setScreen("welcome");
    setPhone(""); setStep("input"); setCode(["", "", "", ""]);
    setDriverLogin(""); setDriverPassword("");
    setAdminLogin(""); setAdminPassword("");
    setError("");
  };

  if (showAgreement) {
    return (
      <div style={{ height: "100%", position: "relative" }}>
        <AgreementScreen onClose={() => setShowAgreement(false)} />
      </div>
    );
  }

  if (screen === "welcome") {
    return (
      <div className="flex flex-col" style={{ height: "100%", background: "var(--taxi-dark)" }}>
        <div className="map-bg relative flex-1 flex items-center justify-center" style={{ minHeight: 160 }}>
          <div className="map-road" style={{ width: 2, height: "100%", left: "30%", top: 0, opacity: 0.4 }} />
          <div className="map-road" style={{ width: 2, height: "100%", left: "70%", top: 0, opacity: 0.3 }} />
          <div className="map-road" style={{ height: 2, width: "100%", top: "40%", left: 0, opacity: 0.4 }} />
          <div className="map-road" style={{ height: 2, width: "100%", top: "70%", left: 0, opacity: 0.3 }} />
          <div className="flex flex-col items-center gap-3 animate-fade-slide-up" style={{ zIndex: 1 }}>
            <div className="animate-pulse-glow" style={{ width: "var(--logo-size)", height: "var(--logo-size)", borderRadius: "var(--logo-radius)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src={LOGO_URL} alt="Taxi" style={{ width: "var(--logo-size)", height: "var(--logo-size)", objectFit: "cover", borderRadius: "var(--logo-radius)" }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--taxi-muted)", marginTop: 4 }}>Быстро. Надёжно. Безопасно.</div>
            </div>
          </div>
          <div className="animate-car absolute" style={{ bottom: 12, fontSize: 22 }}>🚕</div>
        </div>

        <div className="bottom-sheet animate-fade-slide-up animate-delay-200">
          <h2 style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 20, color: "#F0F2F5", marginBottom: 6, textAlign: "center" }}>Добро пожаловать!</h2>
          <p style={{ fontSize: 13, color: "var(--taxi-muted)", marginBottom: 18, textAlign: "center" }}>Выберите, как вы хотите войти</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => setScreen("passenger")}
              style={{
                width: "100%", padding: "14px var(--page-px)", background: "var(--taxi-yellow)", border: "none", borderRadius: "var(--btn-radius)",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "transform 0.15s",
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <div style={{ width: 44, height: 44, background: "rgba(13,15,20,0.15)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name="User" size={22} color="var(--taxi-dark)" />
              </div>
              <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 15, color: "var(--taxi-dark)" }}>Пассажир</div>
                <div style={{ fontSize: 11, color: "rgba(13,15,20,0.6)", marginTop: 1 }}>Вход по номеру телефона</div>
              </div>
              <Icon name="ChevronRight" size={18} color="var(--taxi-dark)" />
            </button>

            <button onClick={() => setScreen("driver")}
              style={{
                width: "100%", padding: "14px var(--page-px)", background: "var(--taxi-surface)", border: "1px solid var(--taxi-border)", borderRadius: "var(--btn-radius)",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "all 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--taxi-yellow)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--taxi-border)")}
            >
              <div style={{ width: 44, height: 44, background: "rgba(255,204,0,0.12)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name="Car" size={22} color="var(--taxi-yellow)" />
              </div>
              <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 15, color: "#F0F2F5" }}>Водитель</div>
                <div style={{ fontSize: 11, color: "var(--taxi-muted)", marginTop: 1 }}>Логин и пароль от администратора</div>
              </div>
              <Icon name="ChevronRight" size={18} color="var(--taxi-muted)" />
            </button>

            <button onClick={() => setScreen("admin")}
              style={{
                width: "100%", padding: "14px var(--page-px)", background: "var(--taxi-surface)", border: "1px solid var(--taxi-border)", borderRadius: "var(--btn-radius)",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "all 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--taxi-yellow)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--taxi-border)")}
            >
              <div style={{ width: 44, height: 44, background: "rgba(255,204,0,0.12)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name="Shield" size={22} color="var(--taxi-yellow)" />
              </div>
              <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 15, color: "#F0F2F5" }}>Администратор</div>
                <div style={{ fontSize: 11, color: "var(--taxi-muted)", marginTop: 1 }}>Вход только по логину и паролю</div>
              </div>
              <Icon name="ChevronRight" size={18} color="var(--taxi-muted)" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "100%", background: "var(--taxi-dark)" }}>
      <div className="map-bg relative" style={{ minHeight: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="map-road" style={{ width: 2, height: "100%", left: "30%", top: 0, opacity: 0.4 }} />
        <div className="map-road" style={{ width: 2, height: "100%", left: "70%", top: 0, opacity: 0.3 }} />
        <div className="map-road" style={{ height: 2, width: "100%", top: "40%", left: 0, opacity: 0.4 }} />
        <div className="map-road" style={{ height: 2, width: "100%", top: "70%", left: 0, opacity: 0.3 }} />
        <div className="flex flex-col items-center gap-2 animate-fade-slide-up" style={{ zIndex: 1 }}>
          <div style={{ width: "var(--logo-sm-size)", height: "var(--logo-sm-size)", borderRadius: "var(--logo-sm-radius)", overflow: "hidden" }}>
            <img src={LOGO_URL} alt="Taxi" style={{ width: "var(--logo-sm-size)", height: "var(--logo-sm-size)", objectFit: "cover", borderRadius: "var(--logo-sm-radius)" }} />
          </div>
          <div style={{ fontFamily: "Montserrat", fontWeight: 900, fontSize: 18, color: "#F0F2F5" }}>
            <span style={{ color: "var(--taxi-yellow)" }}>Taxi</span>
          </div>
        </div>
      </div>

      <div className="bottom-sheet animate-fade-slide-up animate-delay-200" style={{ flex: 1, overflowY: "auto" }}>
        <button onClick={goBack} style={{ background: "none", border: "none", color: "var(--taxi-yellow)", fontSize: 13, cursor: "pointer", padding: "0 0 14px", display: "flex", alignItems: "center", gap: 6, fontFamily: "Golos Text" }}>
          <Icon name="ArrowLeft" size={15} /> Назад
        </button>

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.15)", border: "1px solid var(--taxi-red)", borderRadius: 12,
            padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "var(--taxi-red)", textAlign: "center",
          }}>{error}</div>
        )}

        {screen === "passenger" && step === "input" && (
          <>
            <h2 style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 18, color: "#F0F2F5", marginBottom: 4 }}>Вход для пассажира</h2>
            <p style={{ fontSize: 13, color: "var(--taxi-muted)", marginBottom: 16 }}>Введите номер телефона</p>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#F0F2F5", fontWeight: 600, fontSize: 15, zIndex: 1 }}>+7</div>
              <input className="taxi-input" style={{ paddingLeft: 44 }} placeholder="(999) 000-00-00" type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} maxLength={10} />
            </div>
            <p style={{ fontSize: 12, color: "var(--taxi-muted)", marginBottom: 16, lineHeight: 1.5 }}>
              Нажимая кнопку, вы принимаете <span style={{ color: "var(--taxi-yellow)", cursor: "pointer", textDecoration: "underline" }} onClick={() => setShowAgreement(true)}>условия соглашения</span>
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

        {screen === "passenger" && step === "code" && (
          <>
            <button onClick={() => setStep("input")} style={{ background: "none", border: "none", color: "var(--taxi-yellow)", fontSize: 13, cursor: "pointer", padding: "0 0 14px", display: "flex", alignItems: "center", gap: 6, fontFamily: "Golos Text" }}>
              <Icon name="ArrowLeft" size={15} /> Изменить номер
            </button>
            <h2 style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 20, color: "#F0F2F5", marginBottom: 4 }}>Введите код</h2>
            <p style={{ fontSize: 13, color: "var(--taxi-muted)", marginBottom: 22 }}>Отправили SMS на +7 {phone}</p>
            <div style={{ display: "flex", gap: "var(--code-gap)", justifyContent: "center", marginBottom: 22 }}>
              {code.map((d, i) => (
                <input key={i} className="code-input" value={d} onChange={(e) => handleCodeChange(e.target.value, i)} maxLength={1} type="text" inputMode="numeric"
                  style={{ width: "var(--code-size)", height: "var(--code-size)", background: d ? "var(--taxi-yellow)" : "var(--taxi-surface)", border: `2px solid ${d ? "var(--taxi-yellow)" : "var(--taxi-border)"}`, borderRadius: "var(--btn-radius)", textAlign: "center", fontSize: "var(--code-font)", fontWeight: 700, color: d ? "var(--taxi-dark)" : "#F0F2F5", outline: "none", transition: "all 0.2s", fontFamily: "Montserrat" }} />
              ))}
            </div>
            <button className="btn-yellow" onClick={registerPassenger} disabled={passengerLoading} style={{ opacity: passengerLoading ? 0.6 : 1 }}>
              {passengerLoading ? "Вход..." : "Подтвердить"}
            </button>
            <div style={{ textAlign: "center", marginTop: 14 }}>
              <span style={{ fontSize: 12, color: "var(--taxi-muted)" }}>Не пришёл код? </span>
              <span style={{ fontSize: 12, color: "var(--taxi-yellow)", cursor: "pointer" }}>Отправить ещё раз</span>
            </div>
          </>
        )}

        {screen === "driver" && (
          <>
            <h2 style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 18, color: "#F0F2F5", marginBottom: 4 }}>Вход для водителя</h2>
            <p style={{ fontSize: 13, color: "var(--taxi-muted)", marginBottom: 16 }}>Используйте логин и пароль от администратора</p>
            <input className="taxi-input" placeholder="Логин" value={driverLogin} onChange={(e) => setDriverLogin(e.target.value)} style={{ marginBottom: 10 }} />
            <div style={{ position: "relative", marginBottom: 16 }}>
              <input className="taxi-input" placeholder="Пароль" type={showDriverPass ? "text" : "password"} value={driverPassword} onChange={(e) => setDriverPassword(e.target.value)} style={{ paddingRight: 48 }}
                onKeyDown={(e) => e.key === "Enter" && handleDriverLogin()} />
              <button onClick={() => setShowDriverPass(!showDriverPass)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--taxi-muted)" }}>
                <Icon name={showDriverPass ? "EyeOff" : "Eye"} size={18} fallback="Eye" />
              </button>
            </div>
            <button className="btn-yellow" onClick={handleDriverLogin} disabled={!driverLogin || !driverPassword || driverLoading} style={{ opacity: !driverLogin || !driverPassword || driverLoading ? 0.5 : 1 }}>
              {driverLoading ? "Вход..." : "Войти"}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, justifyContent: "center" }}>
              <Icon name="ShieldCheck" size={14} color="var(--taxi-green)" fallback="Shield" />
              <span style={{ fontSize: 11, color: "var(--taxi-muted)" }}>End-to-end шифрование</span>
            </div>
          </>
        )}

        {screen === "admin" && (
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
            <button className="btn-yellow" onClick={handleAdminLogin} disabled={!adminLogin || !adminPassword || adminLoading} style={{ opacity: !adminLogin || !adminPassword || adminLoading ? 0.5 : 1 }}>
              {adminLoading ? "Вход..." : "Войти"}
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