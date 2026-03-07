import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import YandexMap from "@/components/YandexMap";
import AddressInput from "@/components/AddressInput";
import { Order, User, AppSettings, Driver, LOGO_URL, PaymentMethod, calcOrderPrice } from "./types";
import { playNotificationSound, sendPush } from "./notifications";

interface Props {
  user: User;
  orders: Order[];
  settings: AppSettings;
  drivers: Driver[];
  onOrderCreate: (order: Order) => void;
  onOrderCancel: (id: string) => void;
  onRateDriver?: (driverId: string, rating: number) => void;
  initialFrom?: string;
  initialTo?: string;
}

const TARIFFS = [
  { id: "economy" as const, name: "Эконом", icon: "🚗" },
  { id: "hourly" as const, name: "Грузовой", icon: "🚛" },
  { id: "delivery" as const, name: "Доставка", icon: "📦" },
];

type OrderStep = "form" | "searching" | "found" | "arrived" | "inprogress" | "rating";

export default function PassengerOrderScreen({ user, orders, settings, drivers, onOrderCreate, onOrderCancel, onRateDriver, initialFrom = "", initialTo = "" }: Props) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [tariff, setTariff] = useState<"economy" | "hourly" | "delivery">("economy");
  const [children, setChildren] = useState(false);
  const [childrenCount, setChildrenCount] = useState(1);
  const [luggage, setLuggage] = useState(false);
  const [comment, setComment] = useState("");
  const [deliveryWhat, setDeliveryWhat] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [cargoDesc, setCargoDesc] = useState("");
  const [scheduleType, setScheduleType] = useState<"now" | "scheduled">("now");
  const [scheduleDay, setScheduleDay] = useState("");
  const [scheduleMonth, setScheduleMonth] = useState("");
  const [scheduleHour, setScheduleHour] = useState("");
  const [scheduleMin, setScheduleMin] = useState("");
  const [step, setStep] = useState<OrderStep>("form");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [toast, setToast] = useState<{ text: string; sub?: string } | null>(null);
  const [hoverStar, setHoverStar] = useState(0);
  const [selectedStar, setSelectedStar] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{from: string; text: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [etaMinutes, setEtaMinutes] = useState(5);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [tips, setTips] = useState(0);

  const showToast = (text: string, sub?: string) => {
    setToast({ text, sub });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (step === "found") {
      setEtaMinutes(Math.floor(Math.random() * 6) + 3);
      showToast("Водитель найден!", "Едет к вам");
      playNotificationSound("arrive");
      sendPush("Антипиха Taxi", "Водитель найден и едет к вам!");
    }
    if (step === "arrived") {
      playNotificationSound("arrive");
      sendPush("Антипиха Taxi", "Водитель на месте!");
    }
  }, [step]);

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        if (window.ymaps) {
          const res = await window.ymaps.geocode([latitude, longitude], { results: 1 }).catch(() => null);
          const obj = res?.geoObjects.get(0);
          if (obj) setFrom(obj.getAddressLine());
        }
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  const activeOrder = orders.find((o) => o.id === activeOrderId);
  const assignedDriver = activeOrder?.driverId ? drivers.find(d => d.id === activeOrder.driverId) : null;

  const estimateDistance = (): number => {
    if (!from || !to) return 10;
    const lenDiff = Math.abs(from.length - to.length);
    const combined = from.length + to.length;
    return Math.max(2, Math.min(50, Math.round(combined / 5 + lenDiff)));
  };

  const currentDistanceKm = estimateDistance();
  const calcPrice = () => calcOrderPrice(currentDistanceKm, settings, tariff);

  const isDelivery = tariff === "delivery";
  const isCargo = tariff === "hourly";

  const scheduledAtStr = scheduleType === "scheduled" && scheduleDay && scheduleMonth && scheduleHour && scheduleMin
    ? `${scheduleDay.padStart(2, "0")}.${scheduleMonth.padStart(2, "0")} ${scheduleHour.padStart(2, "0")}:${scheduleMin.padStart(2, "0")}`
    : undefined;

  const canOrder = isDelivery
    ? !!deliveryAddress && !!deliveryWhat
    : (!!from && !!to);

  const handleOrder = () => {
    if (!canOrder) return;
    const order: Order = {
      id: `o_${Date.now()}`,
      passengerId: user.id,
      passengerName: user.name,
      passengerPhone: user.phone,
      from: isDelivery ? "" : from,
      to: isDelivery ? deliveryAddress : to,
      tariff,
      options: {
        children: (isDelivery || isCargo) ? false : children,
        childrenCount: (isDelivery || isCargo) ? 0 : (children ? childrenCount : 0),
        luggage: (isDelivery || isCargo) ? false : luggage,
        comment: isDelivery ? "" : comment,
        deliveryDescription: isDelivery ? deliveryWhat : undefined,
        cargoDescription: isCargo ? cargoDesc : undefined,
      },
      status: "pending",
      paymentMethod,
      tips,
      discount: 0,
      distanceKm: currentDistanceKm,
      price: calcPrice(),
      createdAt: new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
      createdTimestamp: Date.now(),
      freeAt: Date.now(),
      acceptedVia: undefined,
      scheduledAt: scheduledAtStr,
    };
    onOrderCreate(order);
    setActiveOrderId(order.id);
    setStep("searching");
    setTimeout(() => setStep("found"), 3000);
    setTimeout(() => setStep("arrived"), 12000);
    setTimeout(() => setStep("inprogress"), 18000);
    setTimeout(() => setStep("rating"), 26000);
  };

  const handleCancel = () => {
    if (activeOrderId) onOrderCancel(activeOrderId);
    resetOrder();
  };

  const resetOrder = () => {
    setActiveOrderId(null);
    setStep("form");
    setFrom(""); setTo(""); setComment(""); setDeliveryAddress(""); setDeliveryWhat("");
    setChildren(false); setLuggage(false); setCargoDesc("");
    setSelectedStar(0); setHoverStar(0);
    setChatOpen(false); setChatMessages([]);
    setPaymentMethod("cash"); setTips(0);
    setScheduleType("now"); setScheduleDay(""); setScheduleMonth(""); setScheduleHour(""); setScheduleMin("");
  };

  const handleRate = (stars: number) => {
    if (activeOrder?.driverId && onRateDriver) onRateDriver(activeOrder.driverId, stars);
    resetOrder();
    showToast("Спасибо за оценку!", "Это помогает улучшать сервис");
  };

  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { from: "passenger", text: chatInput }]);
    setChatInput("");
    setTimeout(() => {
      setChatMessages(prev => [...prev, { from: "driver", text: "Хорошо, понял!" }]);
      playNotificationSound("message");
    }, 1500);
  };

  const routeLabel = isDelivery ? `Доставка: ${deliveryAddress}` : `${from} → ${to}`;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      {toast && (
        <div style={{
          position: "absolute", top: 16, left: 12, right: 12, zIndex: 200,
          background: "#1C1F2A", border: "1px solid var(--taxi-yellow)",
          borderRadius: 16, padding: "12px 14px",
          display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)", animation: "fade-slide-up 0.3s ease",
        }}>
          <img src={LOGO_URL} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 13, color: "#F0F2F5" }}>{toast.text}</div>
            {toast.sub && <div style={{ fontSize: 11, color: "var(--taxi-muted)", marginTop: 1 }}>{toast.sub}</div>}
          </div>
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "var(--taxi-muted)", cursor: "pointer", padding: 4 }}>
            <Icon name="X" size={14} />
          </button>
        </div>
      )}

      {chatOpen && (
        <div style={{ position: "absolute", inset: 0, zIndex: 300, background: "var(--taxi-dark)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px var(--page-px)", borderBottom: "1px solid var(--taxi-border)", display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setChatOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--taxi-yellow)" }}>
              <Icon name="ArrowLeft" size={20} />
            </button>
            <div style={{ width: 36, height: 36, background: "var(--taxi-yellow)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🚗</div>
            <div>
              <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, color: "#F0F2F5" }}>{assignedDriver?.name ?? "Водитель"}</div>
              <div style={{ fontSize: 11, color: "var(--taxi-green)" }}>Онлайн</div>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "var(--page-px)", display: "flex", flexDirection: "column", gap: 10 }}>
            {chatMessages.length === 0 && <div style={{ textAlign: "center", color: "var(--taxi-muted)", fontSize: 13, marginTop: 40 }}>Напишите водителю</div>}
            {chatMessages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.from === "passenger" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "75%", padding: "10px 14px",
                  borderRadius: msg.from === "passenger" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: msg.from === "passenger" ? "var(--taxi-yellow)" : "var(--taxi-card)",
                  color: msg.from === "passenger" ? "var(--taxi-dark)" : "#F0F2F5", fontSize: 14,
                  border: msg.from === "passenger" ? "none" : "1px solid var(--taxi-border)",
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: "12px var(--page-px) 24px", borderTop: "1px solid var(--taxi-border)", display: "flex", gap: 10 }}>
            <input className="taxi-input" placeholder="Сообщение..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChatMessage()} style={{ flex: 1 }} />
            <button onClick={sendChatMessage} style={{ width: 48, height: 48, background: "var(--taxi-yellow)", border: "none", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Icon name="Send" size={18} color="var(--taxi-dark)" fallback="ArrowRight" />
            </button>
          </div>
        </div>
      )}

      {step === "rating" && activeOrder && (
        <div style={{ position: "absolute", inset: 0, zIndex: 50, background: "var(--taxi-dark)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "var(--page-px)" }} className="animate-fade-slide-up">
          <img src={LOGO_URL} alt="" style={{ width: 56, height: 56, borderRadius: "var(--card-radius)", objectFit: "cover", marginBottom: 14 }} />
          <div style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 20, color: "#F0F2F5", textAlign: "center", marginBottom: 4 }}>
            Спасибо за поездку!
          </div>
          <div style={{ fontSize: 13, color: "var(--taxi-muted)", textAlign: "center", marginBottom: 20, lineHeight: 1.5 }}>
            Мы ценим, что вы выбрали Антипиха Taxi
          </div>
          {assignedDriver && (
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 15, color: "#F0F2F5" }}>{assignedDriver.name}</div>
              <div style={{ fontSize: 12, color: "var(--taxi-muted)", marginTop: 2 }}>{assignedDriver.car}</div>
            </div>
          )}
          <div style={{ fontSize: 13, color: "var(--taxi-muted)", marginBottom: 10 }}>Оцените водителя</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star}
                onMouseEnter={() => setHoverStar(star)} onMouseLeave={() => setHoverStar(0)}
                onClick={() => setSelectedStar(star)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "var(--star-size)", transition: "transform 0.15s", transform: (hoverStar >= star || selectedStar >= star) ? "scale(1.15)" : "scale(1)", filter: (hoverStar >= star || selectedStar >= star) ? "none" : "grayscale(1) opacity(0.3)" }}>
                ⭐
              </button>
            ))}
          </div>
          <button className="btn-yellow" onClick={() => handleRate(selectedStar || 5)} style={{ maxWidth: 280, width: "100%" }}>
            {selectedStar > 0 ? `Оценить на ${selectedStar} ★` : "Пропустить"}
          </button>
        </div>
      )}

      <div style={{ flex: step === "form" ? "0 0 200px" : 1, position: "relative", overflow: "hidden", transition: "flex 0.4s" }}>
        <YandexMap fromAddress={isDelivery ? "" : from} toAddress={isDelivery ? deliveryAddress : to} height="100%" />

        {step === "searching" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, background: "rgba(13,15,20,0.85)", backdropFilter: "blur(4px)" }}>
            <div className="taxi-card" style={{ padding: "var(--page-px)", textAlign: "center", maxWidth: "min(300px, 85vw)" }}>
              <div style={{ fontSize: 12, color: "var(--taxi-muted)", marginBottom: 6 }}>{routeLabel}</div>
              {scheduledAtStr && <div style={{ fontSize: 11, color: "var(--taxi-yellow)", marginBottom: 6 }}>📅 {scheduledAtStr}</div>}
              <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 18, color: "var(--taxi-yellow)", marginBottom: 10 }}>≈ {calcPrice()} ₽</div>
              <div style={{ borderTop: "1px solid var(--taxi-border)", paddingTop: 10 }}>
                <div style={{ fontSize: 11, color: "var(--taxi-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Чаевые для быстрого поиска</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  <input type="number" min={0} max={999999} value={tips || ""} onChange={(e) => setTips(Math.min(999999, Math.max(0, parseInt(e.target.value) || 0)))} placeholder="0" className="taxi-input" style={{ width: 90, textAlign: "center", fontFamily: "Montserrat", fontWeight: 700, fontSize: 15 }} />
                  <span style={{ fontSize: 14, color: "var(--taxi-muted)" }}>₽</span>
                </div>
                {tips > 0 && <div style={{ fontSize: 12, color: "var(--taxi-green)", marginTop: 4 }}>+{tips} ₽ чаевые</div>}
              </div>
            </div>
            <div style={{ width: 56, height: 56, border: "3px solid var(--taxi-border)", borderTop: "3px solid var(--taxi-yellow)", borderRadius: "50%", animation: "spin-slow 1s linear infinite" }} />
            <div style={{ color: "#F0F2F5", fontFamily: "Montserrat", fontWeight: 600, fontSize: 14 }}>Ищем водителя...</div>
            <button onClick={handleCancel} style={{ background: "transparent", border: "1px solid var(--taxi-red)", borderRadius: 12, padding: "10px 24px", color: "var(--taxi-red)", fontSize: 13, cursor: "pointer", fontFamily: "Montserrat", fontWeight: 600 }}>
              Отменить
            </button>
          </div>
        )}

        {step === "found" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1 }} />
            <div style={{ background: "var(--taxi-card)", borderRadius: "20px 20px 0 0", padding: "var(--page-px)", borderTop: "1px solid var(--taxi-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <span className="animate-blink" style={{ color: "var(--taxi-green)" }}>●</span>
                <span style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, color: "#F0F2F5" }}>Водитель найден</span>
                <span style={{ marginLeft: "auto", fontFamily: "Montserrat", fontWeight: 700, fontSize: 13, color: "var(--taxi-yellow)" }}>~{etaMinutes} мин</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, padding: "10px 0", borderTop: "1px solid var(--taxi-border)", borderBottom: "1px solid var(--taxi-border)" }}>
                <div style={{ width: 44, height: 44, background: "var(--taxi-yellow)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🚗</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, color: "#F0F2F5" }}>{assignedDriver?.name ?? "Водитель"}</div>
                  <div style={{ fontSize: 12, color: "var(--taxi-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{assignedDriver?.car ?? ""}</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "var(--taxi-muted)" }}>{routeLabel}</div>
                <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 15, color: "var(--taxi-yellow)" }}>{calcPrice()} ₽</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setChatOpen(true)} style={{ flex: 1, padding: "12px", background: "var(--taxi-surface)", border: "1px solid var(--taxi-border)", borderRadius: 12, color: "#F0F2F5", fontSize: 13, cursor: "pointer", fontFamily: "Montserrat", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Icon name="MessageCircle" size={16} color="var(--taxi-yellow)" /> Чат
                </button>
                <button onClick={handleCancel} style={{ flex: 1, padding: "12px", background: "transparent", border: "1px solid var(--taxi-red)", borderRadius: 12, color: "var(--taxi-red)", fontSize: 13, cursor: "pointer", fontFamily: "Montserrat", fontWeight: 600 }}>
                  Отменить
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "arrived" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1 }} />
            <div style={{ background: "var(--taxi-card)", borderRadius: "20px 20px 0 0", padding: "var(--page-px)", borderTop: "2px solid var(--taxi-green)" }}>
              <div style={{ textAlign: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 32, marginBottom: 6 }}>🚕</div>
                <div style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 15, color: "var(--taxi-green)" }}>Подъехал автомобиль</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: "1px solid var(--taxi-border)", borderBottom: "1px solid var(--taxi-border)", marginBottom: 10 }}>
                <div style={{ width: 44, height: 44, background: "var(--taxi-yellow)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🚗</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, color: "#F0F2F5" }}>{assignedDriver?.name ?? "Водитель"}</div>
                  <div style={{ fontSize: 12, color: "var(--taxi-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{assignedDriver?.car ?? ""}</div>
                </div>
                <div style={{ color: "var(--taxi-yellow)", fontSize: 13, fontWeight: 700 }}>★ {assignedDriver?.rating ?? "4.8"}</div>
              </div>
              <div style={{ fontSize: 12, color: "var(--taxi-muted)", marginBottom: 10 }}>Приблизительно в пути: ~{currentDistanceKm * 2} мин</div>
              <button onClick={() => setChatOpen(true)} style={{ width: "100%", padding: "13px", background: "var(--taxi-surface)", border: "1px solid var(--taxi-border)", borderRadius: 12, color: "#F0F2F5", fontSize: 13, cursor: "pointer", fontFamily: "Montserrat", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Icon name="MessageCircle" size={16} color="var(--taxi-yellow)" /> Написать водителю
              </button>
            </div>
          </div>
        )}

        {step === "inprogress" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1 }} />
            <div style={{ background: "var(--taxi-card)", borderRadius: "20px 20px 0 0", padding: "var(--page-px)", borderTop: "1px solid var(--taxi-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span className="animate-blink" style={{ color: "var(--taxi-yellow)" }}>●</span>
                <span style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, color: "#F0F2F5" }}>В пути</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--taxi-muted)", marginBottom: 4 }}>{routeLabel}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: "1px solid var(--taxi-border)", marginTop: 6 }}>
                <div style={{ width: 40, height: 40, background: "var(--taxi-yellow)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🚗</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "Montserrat", fontWeight: 600, fontSize: 13, color: "#F0F2F5" }}>{assignedDriver?.name ?? "Водитель"}</div>
                  <div style={{ fontSize: 11, color: "var(--taxi-muted)" }}>{assignedDriver?.car ?? ""}</div>
                </div>
                <div>
                  <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 15, color: "var(--taxi-yellow)" }}>{calcPrice()} ₽</div>
                  {activeOrder?.waitingMinutes && activeOrder.waitingMinutes > 0 && (
                    <div style={{ fontSize: 11, color: "var(--taxi-muted)", textAlign: "right" }}>+ожидание</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === "form" && (
          <button onClick={handleLocate} disabled={locating}
            style={{ position: "absolute", right: 14, top: 14, width: 40, height: 40, background: "var(--taxi-card)", border: "1px solid var(--taxi-border)", borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10, opacity: locating ? 0.6 : 1 }}
          >
            {locating
              ? <div style={{ width: 18, height: 18, border: "2px solid var(--taxi-border)", borderTop: "2px solid var(--taxi-yellow)", borderRadius: "50%", animation: "spin-slow 0.8s linear infinite" }} />
              : <Icon name="Locate" size={18} color="var(--taxi-yellow)" fallback="MapPin" />
            }
          </button>
        )}
      </div>

      {step === "form" && (
        <div style={{ background: "var(--taxi-card)", borderRadius: "20px 20px 0 0", borderTop: "1px solid var(--taxi-border)", padding: "14px var(--page-px)", paddingBottom: 80, overflowY: "auto", maxHeight: "calc(100% - 200px)" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {TARIFFS.map((t) => (
              <button key={t.id} onClick={() => setTariff(t.id)}
                style={{
                  flex: 1, padding: "10px 4px", border: `1.5px solid ${tariff === t.id ? "var(--taxi-yellow)" : "var(--taxi-border)"}`,
                  borderRadius: 14, background: tariff === t.id ? "rgba(255,204,0,0.1)" : "var(--taxi-surface)",
                  cursor: "pointer", textAlign: "center", transition: "all 0.2s",
                }}>
                <div style={{ fontSize: 18, marginBottom: 2 }}>{t.icon}</div>
                <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 11, color: tariff === t.id ? "var(--taxi-yellow)" : "#F0F2F5" }}>{t.name}</div>
              </button>
            ))}
          </div>

          {isDelivery ? (
            <>
              <AddressInput value={deliveryAddress} onChange={setDeliveryAddress} placeholder="Куда доставить?" dotColor="var(--taxi-yellow)" />
              <div style={{ height: 8 }} />
              <textarea className="taxi-input" placeholder="Что нужно доставить?" value={deliveryWhat} onChange={(e) => setDeliveryWhat(e.target.value)} rows={2} style={{ resize: "none", marginBottom: 10 }} />
            </>
          ) : (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 14, gap: 2 }}>
                  <div style={{ width: 10, height: 10, background: "var(--taxi-green)", borderRadius: "50%" }} />
                  <div style={{ width: 1, flex: 1, background: "var(--taxi-border)", minHeight: 14 }} />
                  <div style={{ width: 10, height: 10, background: "var(--taxi-yellow)", borderRadius: 2 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <AddressInput value={from} onChange={setFrom} placeholder="Откуда едем?" dotColor="var(--taxi-green)" />
                  <div style={{ height: 6 }} />
                  <AddressInput value={to} onChange={setTo} placeholder="Куда едем?" dotColor="var(--taxi-yellow)" />
                </div>
              </div>

              {isCargo && (
                <textarea className="taxi-input" placeholder="Опишите груз" value={cargoDesc} onChange={(e) => setCargoDesc(e.target.value)} rows={2} style={{ resize: "none", marginBottom: 10 }} />
              )}

              {!isCargo && (
                <>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                    <button onClick={() => setChildren(!children)}
                      style={{
                        padding: "7px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer", fontFamily: "Golos Text",
                        background: children ? "rgba(255,204,0,0.15)" : "var(--taxi-surface)",
                        border: `1px solid ${children ? "var(--taxi-yellow)" : "var(--taxi-border)"}`,
                        color: children ? "var(--taxi-yellow)" : "var(--taxi-muted)",
                      }}>
                      👶 Дети до 7
                    </button>
                    {children && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button onClick={() => setChildrenCount(Math.max(1, childrenCount - 1))} style={{ width: 28, height: 28, borderRadius: 8, background: "var(--taxi-surface)", border: "1px solid var(--taxi-border)", color: "#F0F2F5", cursor: "pointer", fontSize: 14 }}>−</button>
                        <span style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, color: "#F0F2F5", minWidth: 18, textAlign: "center" }}>{childrenCount}</span>
                        <button onClick={() => setChildrenCount(Math.min(4, childrenCount + 1))} style={{ width: 28, height: 28, borderRadius: 8, background: "var(--taxi-surface)", border: "1px solid var(--taxi-border)", color: "#F0F2F5", cursor: "pointer", fontSize: 14 }}>+</button>
                      </div>
                    )}
                    <button onClick={() => setLuggage(!luggage)}
                      style={{
                        padding: "7px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer", fontFamily: "Golos Text",
                        background: luggage ? "rgba(255,204,0,0.15)" : "var(--taxi-surface)",
                        border: `1px solid ${luggage ? "var(--taxi-yellow)" : "var(--taxi-border)"}`,
                        color: luggage ? "var(--taxi-yellow)" : "var(--taxi-muted)",
                      }}>
                      🧳 Багаж
                    </button>
                  </div>
                  <input className="taxi-input" placeholder="Комментарий к заказу" value={comment} onChange={(e) => setComment(e.target.value)} style={{ marginBottom: 10 }} />
                </>
              )}
            </>
          )}

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "var(--taxi-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Время заказа</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setScheduleType("now")}
                style={{
                  flex: 1, padding: "10px", borderRadius: 12, fontSize: 13, cursor: "pointer", fontFamily: "Golos Text", fontWeight: 500,
                  background: scheduleType === "now" ? "rgba(255,204,0,0.15)" : "var(--taxi-surface)",
                  border: `1.5px solid ${scheduleType === "now" ? "var(--taxi-yellow)" : "var(--taxi-border)"}`,
                  color: scheduleType === "now" ? "var(--taxi-yellow)" : "var(--taxi-muted)",
                }}>
                Сейчас
              </button>
              <button onClick={() => setScheduleType("scheduled")}
                style={{
                  flex: 1, padding: "10px", borderRadius: 12, fontSize: 13, cursor: "pointer", fontFamily: "Golos Text", fontWeight: 500,
                  background: scheduleType === "scheduled" ? "rgba(255,204,0,0.15)" : "var(--taxi-surface)",
                  border: `1.5px solid ${scheduleType === "scheduled" ? "var(--taxi-yellow)" : "var(--taxi-border)"}`,
                  color: scheduleType === "scheduled" ? "var(--taxi-yellow)" : "var(--taxi-muted)",
                }}>
                📅 Предварительный
              </button>
            </div>
            {scheduleType === "scheduled" && (
              <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
                <input className="taxi-input" placeholder="ДД" maxLength={2} value={scheduleDay} onChange={e => setScheduleDay(e.target.value.replace(/\D/g, "").slice(0, 2))} style={{ width: 48, textAlign: "center", padding: "10px 6px" }} />
                <span style={{ color: "var(--taxi-muted)", fontWeight: 700 }}>.</span>
                <input className="taxi-input" placeholder="ММ" maxLength={2} value={scheduleMonth} onChange={e => setScheduleMonth(e.target.value.replace(/\D/g, "").slice(0, 2))} style={{ width: 48, textAlign: "center", padding: "10px 6px" }} />
                <div style={{ width: 16 }} />
                <input className="taxi-input" placeholder="ЧЧ" maxLength={2} value={scheduleHour} onChange={e => setScheduleHour(e.target.value.replace(/\D/g, "").slice(0, 2))} style={{ width: 48, textAlign: "center", padding: "10px 6px" }} />
                <span style={{ color: "var(--taxi-muted)", fontWeight: 700 }}>:</span>
                <input className="taxi-input" placeholder="ММ" maxLength={2} value={scheduleMin} onChange={e => setScheduleMin(e.target.value.replace(/\D/g, "").slice(0, 2))} style={{ width: 48, textAlign: "center", padding: "10px 6px" }} />
              </div>
            )}
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "var(--taxi-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Оплата (для водителя)</div>
            <div style={{ display: "flex", gap: 6 }}>
              {([{ id: "cash" as const, label: "💵 Наличные" }, { id: "transfer" as const, label: "📱 Перевод" }]).map((pm) => (
                <button key={pm.id} onClick={() => setPaymentMethod(pm.id)}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 12, fontSize: 13, cursor: "pointer", fontFamily: "Golos Text", fontWeight: 500,
                    background: paymentMethod === pm.id ? "rgba(255,204,0,0.15)" : "var(--taxi-surface)",
                    border: `1.5px solid ${paymentMethod === pm.id ? "var(--taxi-yellow)" : "var(--taxi-border)"}`,
                    color: paymentMethod === pm.id ? "var(--taxi-yellow)" : "var(--taxi-muted)",
                  }}>
                  {pm.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "8px 0", borderTop: "1px solid var(--taxi-border)" }}>
            <div style={{ fontSize: 13, color: "var(--taxi-muted)" }}>Предварительная стоимость:</div>
            <div style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 20, color: "var(--taxi-yellow)" }}>≈ {calcPrice()} ₽</div>
          </div>

          <button className="btn-yellow" onClick={handleOrder} disabled={!canOrder} style={{ opacity: canOrder ? 1 : 0.5 }}>
            {isDelivery ? "Заказать доставку" : isCargo ? "Заказать грузовое" : "Заказать такси"}
          </button>
        </div>
      )}
    </div>
  );
}