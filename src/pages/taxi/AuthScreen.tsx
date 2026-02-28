import { useState } from "react";
import Icon from "@/components/ui/icon";

interface Props {
  onAuth: () => void;
}

export default function AuthScreen({ onAuth }: Props) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState(["", "", "", ""]);

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
      setTimeout(onAuth, 400);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: "100%", background: "var(--taxi-dark)" }}>
      {/* Hero map area */}
      <div className="map-bg relative flex-1 flex items-center justify-center" style={{ minHeight: 280 }}>
        {/* Decorative roads */}
        <div className="map-road" style={{ width: 2, height: "100%", left: "30%", top: 0, opacity: 0.4 }} />
        <div className="map-road" style={{ width: 2, height: "100%", left: "70%", top: 0, opacity: 0.3 }} />
        <div className="map-road" style={{ height: 2, width: "100%", top: "40%", left: 0, opacity: 0.4 }} />
        <div className="map-road" style={{ height: 2, width: "100%", top: "65%", left: 0, opacity: 0.3 }} />

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 animate-fade-slide-up" style={{ zIndex: 1 }}>
          <div
            className="animate-pulse-glow"
            style={{
              width: 72,
              height: 72,
              background: "var(--taxi-yellow)",
              borderRadius: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 36 }}>🚖</span>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: "Montserrat",
                fontWeight: 900,
                fontSize: 28,
                color: "#F0F2F5",
                letterSpacing: "-0.5px",
              }}
            >
              TAXI<span style={{ color: "var(--taxi-yellow)" }}>GO</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--taxi-muted)", marginTop: 2 }}>
              Быстро. Надёжно. Везде.
            </div>
          </div>
        </div>

        {/* Animated car */}
        <div className="animate-car absolute" style={{ bottom: 24, fontSize: 28 }}>
          🚕
        </div>
      </div>

      {/* Auth form */}
      <div className="bottom-sheet animate-fade-slide-up animate-delay-200" style={{ paddingTop: 24 }}>
        {step === "phone" ? (
          <>
            <h2
              style={{
                fontFamily: "Montserrat",
                fontWeight: 700,
                fontSize: 22,
                color: "#F0F2F5",
                marginBottom: 6,
              }}
            >
              Войти или зарегистрироваться
            </h2>
            <p style={{ fontSize: 14, color: "var(--taxi-muted)", marginBottom: 20 }}>
              Введите номер телефона для входа
            </p>

            <div style={{ position: "relative", marginBottom: 12 }}>
              <div
                style={{
                  position: "absolute",
                  left: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#F0F2F5",
                  fontWeight: 600,
                  fontSize: 15,
                  zIndex: 1,
                }}
              >
                +7
              </div>
              <input
                className="taxi-input"
                style={{ paddingLeft: 44 }}
                placeholder="(999) 000-00-00"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                maxLength={10}
              />
            </div>

            <p style={{ fontSize: 12, color: "var(--taxi-muted)", marginBottom: 20, lineHeight: 1.5 }}>
              Нажимая кнопку, вы принимаете{" "}
              <span style={{ color: "var(--taxi-yellow)" }}>условия соглашения</span>
            </p>

            <button className="btn-yellow" onClick={handlePhoneNext}>
              Получить код →
            </button>

            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              {["Google", "Apple"].map((s) => (
                <button
                  key={s}
                  style={{
                    flex: 1,
                    padding: "13px",
                    background: "var(--taxi-surface)",
                    border: "1px solid var(--taxi-border)",
                    borderRadius: 14,
                    color: "#F0F2F5",
                    fontFamily: "Golos Text",
                    fontWeight: 500,
                    fontSize: 14,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {s === "Google" ? "🅖" : "🍎"} {s}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => setStep("phone")}
              style={{
                background: "none",
                border: "none",
                color: "var(--taxi-yellow)",
                fontSize: 14,
                cursor: "pointer",
                padding: "0 0 16px",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "Golos Text",
              }}
            >
              <Icon name="ArrowLeft" size={16} /> Назад
            </button>

            <h2
              style={{
                fontFamily: "Montserrat",
                fontWeight: 700,
                fontSize: 22,
                color: "#F0F2F5",
                marginBottom: 6,
              }}
            >
              Введите код
            </h2>
            <p style={{ fontSize: 14, color: "var(--taxi-muted)", marginBottom: 28 }}>
              Отправили SMS на +7 {phone}
            </p>

            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 28 }}>
              {code.map((d, i) => (
                <input
                  key={i}
                  className="code-input"
                  value={d}
                  onChange={(e) => handleCodeChange(e.target.value, i)}
                  maxLength={1}
                  type="text"
                  inputMode="numeric"
                  style={{
                    width: 64,
                    height: 64,
                    background: d ? "var(--taxi-yellow)" : "var(--taxi-surface)",
                    border: `2px solid ${d ? "var(--taxi-yellow)" : "var(--taxi-border)"}`,
                    borderRadius: 16,
                    textAlign: "center",
                    fontSize: 24,
                    fontWeight: 700,
                    color: d ? "var(--taxi-dark)" : "#F0F2F5",
                    outline: "none",
                    transition: "all 0.2s",
                    fontFamily: "Montserrat",
                  }}
                />
              ))}
            </div>

            <button className="btn-yellow" onClick={onAuth}>
              Подтвердить
            </button>

            <div style={{ textAlign: "center", marginTop: 16 }}>
              <span style={{ fontSize: 13, color: "var(--taxi-muted)" }}>Не пришёл код? </span>
              <span style={{ fontSize: 13, color: "var(--taxi-yellow)", cursor: "pointer" }}>
                Отправить ещё раз
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
