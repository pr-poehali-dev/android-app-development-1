import { useState } from "react";
import Icon from "@/components/ui/icon";
import YandexMap from "@/components/YandexMap";
import AddressInput from "@/components/AddressInput";
import { Order, User, AppSettings } from "./types";

interface Props {
  user: User;
  orders: Order[];
  settings: AppSettings;
  onOrderCreate: (order: Order) => void;
  onOrderCancel: (id: string) => void;
}

const TARIFFS = [
  { id: "economy" as const, name: "Эконом", icon: "🚗", time: "3 мин", baseKm: 0 },
  { id: "comfort" as const, name: "Комфорт", icon: "🚙", time: "5 мин", baseKm: 8 },
  { id: "business" as const, name: "Бизнес", icon: "🚘", time: "7 мин", baseKm: 18 },
  { id: "hourly" as const, name: "Почасовой", icon: "⏱️", time: "10 мин", baseKm: 0 },
];

type OrderStep = "form" | "searching" | "found";

export default function PassengerOrderScreen({ user, orders, settings, onOrderCreate, onOrderCancel }: Props) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tariff, setTariff] = useState<"economy" | "comfort" | "business" | "hourly">("economy");
  const [children, setChildren] = useState(false);
  const [childrenCount, setChildrenCount] = useState(1);
  const [luggage, setLuggage] = useState(false);
  const [comment, setComment] = useState("");
  const [step, setStep] = useState<OrderStep>("form");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  const activeOrder = orders.find((o) => o.id === activeOrderId);

  const calcPrice = () => {
    const t = TARIFFS.find((t) => t.id === tariff)!;
    if (tariff === "hourly") return settings.pricePerHour;
    const dist = 10;
    return Math.round(dist * settings.pricePerKm + t.baseKm);
  };

  const handleOrder = () => {
    if (!from || !to) return;
    const order: Order = {
      id: `o_${Date.now()}`,
      passengerId: user.id,
      passengerName: user.name,
      from,
      to,
      tariff,
      options: { children, childrenCount: children ? childrenCount : 0, luggage, comment },
      status: "pending",
      price: calcPrice(),
      createdAt: new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
    };
    onOrderCreate(order);
    setActiveOrderId(order.id);
    setStep("searching");
    setTimeout(() => setStep("found"), 3000);
  };

  const handleCancel = () => {
    if (activeOrderId) onOrderCancel(activeOrderId);
    setActiveOrderId(null);
    setStep("form");
    setFrom(""); setTo(""); setComment("");
    setChildren(false); setLuggage(false);
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Map */}
      <div style={{ flex: step === "form" ? "0 0 200px" : 1, position: "relative", overflow: "hidden", transition: "flex 0.4s" }}>
        <YandexMap fromAddress={from} toAddress={to} height="100%" />

        {step === "searching" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, background: "rgba(13,15,20,0.75)", backdropFilter: "blur(4px)" }}>
            <div style={{ width: 64, height: 64, border: "3px solid var(--taxi-border)", borderTop: "3px solid var(--taxi-yellow)", borderRadius: "50%", animation: "spin-slow 1s linear infinite" }} />
            <div style={{ color: "#F0F2F5", fontFamily: "Montserrat", fontWeight: 600, fontSize: 15 }}>Ищем водителя...</div>
          </div>
        )}

        {step === "found" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <div className="animate-car" style={{ fontSize: 44 }}>🚕</div>
            <div style={{ background: "var(--taxi-yellow)", color: "var(--taxi-dark)", padding: "7px 18px", borderRadius: 18, fontFamily: "Montserrat", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <span className="animate-blink">●</span> Водитель едет к вам
            </div>
          </div>
        )}

        <button style={{ position: "absolute", right: 14, top: 14, width: 40, height: 40, background: "var(--taxi-card)", border: "1px solid var(--taxi-border)", borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10 }}>
          <Icon name="Locate" size={18} color="var(--taxi-yellow)" fallback="MapPin" />
        </button>
      </div>

      {/* Bottom panel */}
      <div className="bottom-sheet" style={{ paddingBottom: 88, overflowY: "auto", maxHeight: step === "form" ? "none" : 260 }}>
        {step === "found" && activeOrder ? (
          <DriverFoundCard order={activeOrder} onCancel={handleCancel} />
        ) : step === "searching" ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ fontSize: 14, color: "var(--taxi-muted)", marginBottom: 16 }}>Обычно это занимает 2-4 минуты</div>
            <button onClick={handleCancel} style={{ padding: "12px 32px", background: "transparent", border: "1px solid var(--taxi-border)", borderRadius: 14, color: "var(--taxi-red)", fontFamily: "Golos Text", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
              Отменить поиск
            </button>
          </div>
        ) : (
          <>
            {/* Address inputs */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              <AddressInput
                value={from}
                onChange={setFrom}
                placeholder="Откуда едем?"
                dotColor="var(--taxi-green)"
                dotRadius={50}
              />
              <AddressInput
                value={to}
                onChange={setTo}
                placeholder="Куда едем?"
                dotColor="var(--taxi-yellow)"
                dotRadius={2}
              />
            </div>

            {/* Tariffs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}>
              {TARIFFS.map((t) => {
                const price = t.id === "hourly" ? `${settings.pricePerHour} ₽/ч` : `от ${Math.round(10 * settings.pricePerKm + t.baseKm)} ₽`;
                return (
                  <button key={t.id} onClick={() => setTariff(t.id)}
                    style={{ flex: "0 0 auto", minWidth: 90, padding: "10px 10px", background: tariff === t.id ? "var(--taxi-yellow)" : "var(--taxi-surface)", border: `1px solid ${tariff === t.id ? "var(--taxi-yellow)" : "var(--taxi-border)"}`, borderRadius: 14, cursor: "pointer", transition: "all 0.2s", textAlign: "left" }}>
                    <div style={{ fontSize: 18, marginBottom: 3 }}>{t.icon}</div>
                    <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 12, color: tariff === t.id ? "var(--taxi-dark)" : "#F0F2F5" }}>{t.name}</div>
                    <div style={{ fontSize: 10, color: tariff === t.id ? "rgba(13,15,20,0.6)" : "var(--taxi-muted)" }}>{t.time}</div>
                    <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 13, color: tariff === t.id ? "var(--taxi-dark)" : "var(--taxi-yellow)", marginTop: 2 }}>{price}</div>
                  </button>
                );
              })}
            </div>

            {/* Options */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "var(--taxi-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Дополнительно</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Children */}
                <div className="taxi-card" style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 20 }}>👶</span>
                      <div>
                        <div style={{ fontSize: 14, color: "#F0F2F5", fontWeight: 500 }}>Дети до 7 лет</div>
                        <div style={{ fontSize: 11, color: "var(--taxi-muted)" }}>Нужно детское кресло</div>
                      </div>
                    </div>
                    <Toggle value={children} onChange={setChildren} />
                  </div>
                  {children && (
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 13, color: "var(--taxi-muted)" }}>Количество:</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <button onClick={() => setChildrenCount(Math.max(1, childrenCount - 1))} style={{ width: 30, height: 30, background: "var(--taxi-surface)", border: "1px solid var(--taxi-border)", borderRadius: 8, color: "#F0F2F5", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                        <span style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 18, color: "var(--taxi-yellow)", minWidth: 20, textAlign: "center" }}>{childrenCount}</span>
                        <button onClick={() => setChildrenCount(Math.min(4, childrenCount + 1))} style={{ width: 30, height: 30, background: "var(--taxi-surface)", border: "1px solid var(--taxi-border)", borderRadius: 8, color: "#F0F2F5", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Luggage */}
                <div className="taxi-card" style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 20 }}>🧳</span>
                      <div>
                        <div style={{ fontSize: 14, color: "#F0F2F5", fontWeight: 500 }}>Крупный багаж</div>
                        <div style={{ fontSize: 11, color: "var(--taxi-muted)" }}>Чемодан, коробки</div>
                      </div>
                    </div>
                    <Toggle value={luggage} onChange={setLuggage} />
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <textarea
                    className="taxi-input"
                    placeholder="💬 Комментарий водителю (необязательно)..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={2}
                    style={{ resize: "none", fontFamily: "Golos Text", lineHeight: 1.5 }}
                  />
                </div>
              </div>
            </div>

            <button className="btn-yellow" onClick={handleOrder} style={{ opacity: from && to ? 1 : 0.5 }}>
              Заказать · {calcPrice()} ₽{tariff === "hourly" ? "/ч" : ""}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!value)}
      style={{ width: 44, height: 26, background: value ? "var(--taxi-yellow)" : "var(--taxi-surface)", borderRadius: 13, position: "relative", cursor: "pointer", transition: "background 0.2s", border: `1px solid ${value ? "var(--taxi-yellow)" : "var(--taxi-border)"}`, flexShrink: 0 }}>
      <div style={{ position: "absolute", width: 20, height: 20, background: value ? "var(--taxi-dark)" : "#F0F2F5", borderRadius: "50%", top: 2, left: value ? 21 : 2, transition: "left 0.2s" }} />
    </div>
  );
}

function DriverFoundCard({ order, onCancel }: { order: Order; onCancel: () => void }) {
  return (
    <div className="animate-fade-slide-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 15, color: "#F0F2F5", marginBottom: 2 }}>Водитель найден!</div>
          <div style={{ fontSize: 12, color: "var(--taxi-green)", display: "flex", alignItems: "center", gap: 4 }}>
            <span className="animate-blink">●</span> Прибудет через 4 мин
          </div>
        </div>
        <div style={{ background: "var(--taxi-yellow)", borderRadius: 10, padding: "5px 12px", fontFamily: "Montserrat", fontWeight: 700, fontSize: 16, color: "var(--taxi-dark)", letterSpacing: 2 }}>А 123 БВ</div>
      </div>
      <div className="taxi-card" style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 44, height: 44, background: "var(--taxi-surface)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>👨</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#F0F2F5", marginBottom: 2 }}>Алексей К.</div>
            <div style={{ fontSize: 12, color: "var(--taxi-muted)" }}>★ 4.9 · Toyota Camry · Белый</div>
          </div>
          <button style={{ width: 40, height: 40, background: "var(--taxi-yellow)", border: "none", borderRadius: 11, fontSize: 18, cursor: "pointer" }}>📞</button>
        </div>
        {(order.options.children || order.options.luggage) && (
          <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {order.options.children && <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-yellow)" }}>👶 Дети: {order.options.childrenCount}</span>}
            {order.options.luggage && <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-yellow)" }}>🧳 Багаж</span>}
          </div>
        )}
      </div>
      <button onClick={onCancel} style={{ width: "100%", padding: "13px", background: "transparent", border: "1px solid var(--taxi-border)", borderRadius: 14, color: "var(--taxi-red)", fontFamily: "Golos Text", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
        Отменить поездку
      </button>
    </div>
  );
}