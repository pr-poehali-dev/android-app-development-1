import { useState } from "react";
import Icon from "@/components/ui/icon";

interface Props {
  onLogout: () => void;
}

const SETTINGS = [
  { icon: "CreditCard", label: "Способы оплаты", value: "Visa •••• 4242" },
  { icon: "Bell", label: "Уведомления", value: "Включены" },
  { icon: "MapPin", label: "Любимые адреса", value: "3 адреса" },
  { icon: "Shield", label: "Безопасность", value: "Пароль установлен" },
  { icon: "Gift", label: "Промокоды", value: "1 активный" },
];

export default function ProfileScreen({ onLogout }: Props) {
  const [notifications, setNotifications] = useState(true);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--taxi-dark)" }}>
      {/* Header */}
      <div
        style={{
          padding: "20px 24px 28px",
          background: "linear-gradient(180deg, var(--taxi-card) 0%, var(--taxi-dark) 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Avatar */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                width: 72,
                height: 72,
                background: "var(--taxi-yellow)",
                borderRadius: 22,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
              }}
            >
              👤
            </div>
            <div
              style={{
                position: "absolute",
                bottom: -2,
                right: -2,
                width: 22,
                height: 22,
                background: "var(--taxi-green)",
                borderRadius: "50%",
                border: "2px solid var(--taxi-dark)",
              }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <h2
              style={{
                fontFamily: "Montserrat",
                fontWeight: 800,
                fontSize: 20,
                color: "#F0F2F5",
                marginBottom: 2,
              }}
            >
              Иван Петров
            </h2>
            <p style={{ fontSize: 13, color: "var(--taxi-muted)", marginBottom: 6 }}>+7 (916) 123-45-67</p>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "var(--taxi-yellow)", fontSize: 13 }}>★ 4.9</span>
              <span style={{ color: "var(--taxi-muted)", fontSize: 12 }}>• 47 поездок</span>
            </div>
          </div>

          <button
            style={{
              width: 40,
              height: 40,
              background: "var(--taxi-surface)",
              border: "1px solid var(--taxi-border)",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Icon name="Pencil" size={16} color="var(--taxi-yellow)" fallback="Edit" />
          </button>
        </div>

        {/* Loyalty card */}
        <div
          style={{
            marginTop: 20,
            background: "linear-gradient(135deg, #FFCC00 0%, #FF9900 100%)",
            borderRadius: 18,
            padding: "16px 20px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: -20,
              top: -20,
              width: 100,
              height: 100,
              background: "rgba(255,255,255,0.1)",
              borderRadius: "50%",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, color: "rgba(13,15,20,0.6)", marginBottom: 2 }}>Бонусные баллы</div>
              <div
                style={{
                  fontFamily: "Montserrat",
                  fontWeight: 900,
                  fontSize: 28,
                  color: "var(--taxi-dark)",
                }}
              >
                1 240
              </div>
              <div style={{ fontSize: 11, color: "rgba(13,15,20,0.6)" }}>≈ 124 ₽ на следующую поездку</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "rgba(13,15,20,0.6)", marginBottom: 2 }}>Уровень</div>
              <div style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 16, color: "var(--taxi-dark)" }}>
                🥇 Золотой
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div
            style={{
              marginTop: 12,
              background: "rgba(13,15,20,0.15)",
              borderRadius: 4,
              height: 4,
            }}
          >
            <div
              style={{
                width: "68%",
                height: "100%",
                background: "var(--taxi-dark)",
                borderRadius: 4,
                opacity: 0.5,
              }}
            />
          </div>
          <div style={{ fontSize: 10, color: "rgba(13,15,20,0.5)", marginTop: 4 }}>
            760 баллов до уровня Платиновый
          </div>
        </div>
      </div>

      {/* Settings list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 24px", paddingBottom: 88 }}>
        <div style={{ fontSize: 11, color: "var(--taxi-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
          Настройки
        </div>

        {SETTINGS.map((item, idx) => (
          <div
            key={item.label}
            className="animate-fade-slide-up"
            style={{
              display: "flex",
              alignItems: "center",
              padding: "14px 0",
              borderBottom: idx < SETTINGS.length - 1 ? "1px solid var(--taxi-border)" : "none",
              cursor: "pointer",
              animationDelay: `${idx * 0.06}s`,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                background: "var(--taxi-surface)",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
                flexShrink: 0,
              }}
            >
              <Icon name={item.icon} size={18} color="var(--taxi-yellow)" fallback="Settings" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, color: "#F0F2F5", marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontSize: 12, color: "var(--taxi-muted)" }}>{item.value}</div>
            </div>
            {item.icon === "Bell" ? (
              <div
                onClick={() => setNotifications(!notifications)}
                style={{
                  width: 44,
                  height: 26,
                  background: notifications ? "var(--taxi-yellow)" : "var(--taxi-surface)",
                  borderRadius: 13,
                  position: "relative",
                  cursor: "pointer",
                  transition: "background 0.2s",
                  border: `1px solid ${notifications ? "var(--taxi-yellow)" : "var(--taxi-border)"}`,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    width: 20,
                    height: 20,
                    background: notifications ? "var(--taxi-dark)" : "#F0F2F5",
                    borderRadius: "50%",
                    top: 2,
                    left: notifications ? 21 : 2,
                    transition: "left 0.2s",
                  }}
                />
              </div>
            ) : (
              <Icon name="ChevronRight" size={18} color="var(--taxi-muted)" fallback="ArrowRight" />
            )}
          </div>
        ))}

        {/* Logout */}
        <button
          onClick={onLogout}
          style={{
            width: "100%",
            marginTop: 20,
            padding: "14px",
            background: "transparent",
            border: "1px solid var(--taxi-border)",
            borderRadius: 16,
            color: "var(--taxi-red)",
            fontFamily: "Golos Text",
            fontWeight: 600,
            fontSize: 15,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Icon name="LogOut" size={18} color="var(--taxi-red)" fallback="LogOut" />
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}
