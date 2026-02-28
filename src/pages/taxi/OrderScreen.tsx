import { useState } from "react";
import Icon from "@/components/ui/icon";

const TARIFFS = [
  { id: "economy", name: "Эконом", icon: "🚗", price: "149 ₽", time: "3 мин", desc: "Доступно" },
  { id: "comfort", name: "Комфорт", icon: "🚙", price: "249 ₽", time: "5 мин", desc: "Популярно" },
  { id: "business", name: "Бизнес", icon: "🚘", price: "449 ₽", time: "7 мин", desc: "Премиум" },
];

type OrderStep = "idle" | "searching" | "found";

export default function OrderScreen() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tariff, setTariff] = useState("comfort");
  const [step, setStep] = useState<OrderStep>("idle");

  const handleOrder = () => {
    if (!from || !to) return;
    setStep("searching");
    setTimeout(() => setStep("found"), 3000);
  };

  const selected = TARIFFS.find((t) => t.id === tariff)!;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Map */}
      <div className="map-bg" style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {/* Grid lines */}
        <div className="map-road" style={{ width: 3, height: "100%", left: "25%", top: 0, opacity: 0.5 }} />
        <div className="map-road" style={{ width: 3, height: "100%", left: "60%", top: 0, opacity: 0.4 }} />
        <div className="map-road" style={{ height: 3, width: "100%", top: "35%", left: 0, opacity: 0.5 }} />
        <div className="map-road" style={{ height: 3, width: "100%", top: "60%", left: 0, opacity: 0.3 }} />
        <div className="map-road" style={{ width: 2, height: "60%", left: "45%", top: 0, opacity: 0.3 }} />
        <div className="map-road" style={{ height: 2, width: "40%", top: "80%", left: "30%", opacity: 0.3 }} />

        {/* Location pin */}
        {step === "idle" && (
          <div
            style={{
              position: "absolute",
              top: "40%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                background: "var(--taxi-yellow)",
                borderRadius: "50% 50% 50% 0",
                transform: "rotate(-45deg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 20px rgba(255,204,0,0.5)",
              }}
            >
              <div style={{ transform: "rotate(45deg)", fontSize: 18 }}>📍</div>
            </div>
            <div
              style={{
                width: 8,
                height: 8,
                background: "rgba(255,204,0,0.3)",
                borderRadius: "50%",
                marginTop: 2,
              }}
            />
          </div>
        )}

        {/* Searching animation */}
        {step === "searching" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              background: "rgba(13,15,20,0.7)",
              backdropFilter: "blur(4px)",
            }}
          >
            <div
              style={{
                width: 70,
                height: 70,
                border: "3px solid var(--taxi-border)",
                borderTop: "3px solid var(--taxi-yellow)",
                borderRadius: "50%",
                animation: "spin-slow 1s linear infinite",
              }}
            />
            <div style={{ color: "#F0F2F5", fontFamily: "Montserrat", fontWeight: 600, fontSize: 16 }}>
              Ищем водителя...
            </div>
            <div style={{ fontSize: 13, color: "var(--taxi-muted)" }}>Обычно это занимает 2-4 минуты</div>
          </div>
        )}

        {/* Driver found */}
        {step === "found" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <div className="animate-car" style={{ fontSize: 48 }}>🚕</div>
            <div
              style={{
                background: "var(--taxi-yellow)",
                color: "var(--taxi-dark)",
                padding: "8px 20px",
                borderRadius: 20,
                fontFamily: "Montserrat",
                fontWeight: 700,
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span className="animate-blink">●</span> Водитель едет к вам
            </div>
          </div>
        )}

        {/* My location button */}
        <button
          style={{
            position: "absolute",
            right: 16,
            top: 16,
            width: 44,
            height: 44,
            background: "var(--taxi-card)",
            border: "1px solid var(--taxi-border)",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Icon name="Locate" size={20} color="var(--taxi-yellow)" fallback="MapPin" />
        </button>
      </div>

      {/* Bottom panel */}
      <div className="bottom-sheet" style={{ paddingBottom: 88 }}>
        {step === "found" ? (
          <DriverCard onCancel={() => setStep("idle")} />
        ) : (
          <>
            {/* Address inputs */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 10,
                    height: 10,
                    background: "var(--taxi-green)",
                    borderRadius: "50%",
                  }}
                />
                <input
                  className="taxi-input"
                  style={{ paddingLeft: 36 }}
                  placeholder="Откуда едем?"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 10,
                  marginTop: 36,
                }}
              />
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 10,
                    height: 10,
                    background: "var(--taxi-yellow)",
                    borderRadius: 2,
                  }}
                />
                <input
                  className="taxi-input"
                  style={{ paddingLeft: 36 }}
                  placeholder="Куда едем?"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </div>

            {/* Tariffs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" }}>
              {TARIFFS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTariff(t.id)}
                  style={{
                    flex: "0 0 auto",
                    minWidth: 100,
                    padding: "10px 12px",
                    background: tariff === t.id ? "var(--taxi-yellow)" : "var(--taxi-surface)",
                    border: `1px solid ${tariff === t.id ? "var(--taxi-yellow)" : "var(--taxi-border)"}`,
                    borderRadius: 14,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{t.icon}</div>
                  <div
                    style={{
                      fontFamily: "Montserrat",
                      fontWeight: 700,
                      fontSize: 13,
                      color: tariff === t.id ? "var(--taxi-dark)" : "#F0F2F5",
                    }}
                  >
                    {t.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: tariff === t.id ? "rgba(13,15,20,0.7)" : "var(--taxi-muted)",
                    }}
                  >
                    {t.time}
                  </div>
                  <div
                    style={{
                      fontFamily: "Montserrat",
                      fontWeight: 700,
                      fontSize: 14,
                      color: tariff === t.id ? "var(--taxi-dark)" : "var(--taxi-yellow)",
                      marginTop: 2,
                    }}
                  >
                    {t.price}
                  </div>
                </button>
              ))}
            </div>

            <button
              className="btn-yellow"
              onClick={handleOrder}
              style={{ opacity: from && to ? 1 : 0.5 }}
            >
              Заказать — {selected.price}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function DriverCard({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="animate-fade-slide-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div
            style={{
              fontFamily: "Montserrat",
              fontWeight: 700,
              fontSize: 16,
              color: "#F0F2F5",
              marginBottom: 2,
            }}
          >
            Водитель найден!
          </div>
          <div style={{ fontSize: 13, color: "var(--taxi-green)", display: "flex", alignItems: "center", gap: 4 }}>
            <span className="animate-blink">●</span> Прибудет через 4 минуты
          </div>
        </div>
        <div
          style={{
            background: "var(--taxi-yellow)",
            borderRadius: 12,
            padding: "6px 12px",
            fontFamily: "Montserrat",
            fontWeight: 700,
            fontSize: 18,
            color: "var(--taxi-dark)",
            letterSpacing: 2,
          }}
        >
          А 123 БВ
        </div>
      </div>

      <div className="taxi-card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 48,
              height: 48,
              background: "var(--taxi-surface)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
            }}
          >
            👨
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: "#F0F2F5", marginBottom: 2 }}>Алексей К.</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "var(--taxi-yellow)", fontSize: 13 }}>★ 4.9</span>
              <span style={{ color: "var(--taxi-muted)", fontSize: 12 }}>• Toyota Camry • Белый</span>
            </div>
          </div>
          <button
            style={{
              width: 44,
              height: 44,
              background: "var(--taxi-yellow)",
              border: "none",
              borderRadius: 12,
              fontSize: 20,
              cursor: "pointer",
            }}
          >
            📞
          </button>
        </div>
      </div>

      <button
        onClick={onCancel}
        style={{
          width: "100%",
          padding: "14px",
          background: "transparent",
          border: "1px solid var(--taxi-border)",
          borderRadius: 16,
          color: "var(--taxi-red)",
          fontFamily: "Golos Text",
          fontWeight: 600,
          fontSize: 15,
          cursor: "pointer",
        }}
      >
        Отменить поездку
      </button>
    </div>
  );
}
