import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import {
  Order,
  Driver,
  AppSettings,
  DriverCarInfo,
  SupportMessage,
  LOGO_URL,
  isSubscriptionActive,
  subscriptionDaysLeft,
} from "./types";
import { playNotificationSound, sendPush } from "./notifications";
import api from "./api";

const TARIFF_LABELS: Record<Order["tariff"], string> = {
  economy: "Эконом",
  hourly: "Грузовой",
  delivery: "Доставка",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Наличные",
  transfer: "Перевод",
};

interface Props {
  driver: Driver;
  orders: Order[];
  settings: AppSettings;
  onAcceptOrder: (orderId: string, driverId: string, driverName: string, eta: number) => void;
  onToggleAutoAssign: (driverId: string) => void;
  onUpdateOrderStatus: (orderId: string, status: Order["status"]) => void;
  onUpdateDriverCar: (driverId: string, carInfo: DriverCarInfo) => void;
  onLogout: () => void;
  onSendSupport: (msg: SupportMessage) => void;
  supportMessages: SupportMessage[];
  userId: string;
  onMarkMessagesRead: (userId: string, readerRole: "admin" | "passenger" | "driver") => void;
}

type DriverTab = "profile" | "orders" | "history" | "chat";

const NAV_ITEMS = [
  { id: "profile" as const, label: "Профиль", icon: "User" },
  { id: "orders" as const, label: "Заказы", icon: "ClipboardList" },
  { id: "history" as const, label: "История", icon: "Clock" },
  { id: "chat" as const, label: "Чат", icon: "MessageSquare" },
];

export default function DriverScreen({
  driver,
  orders,
  settings,
  onAcceptOrder,
  onToggleAutoAssign,
  onUpdateOrderStatus,
  onUpdateDriverCar,
  onLogout,
  onSendSupport,
  supportMessages,
  userId,
  onMarkMessagesRead,
}: Props) {
  const [tab, setTab] = useState<DriverTab>("profile");
  const [editingCar, setEditingCar] = useState(false);
  const [carBrand, setCarBrand] = useState(driver.carInfo.brand);
  const [carModel, setCarModel] = useState(driver.carInfo.model);
  const [carPlate, setCarPlate] = useState(driver.carInfo.plateNumber);
  const [etaSelect, setEtaSelect] = useState<{ orderId: string } | null>(null);
  const [etaMinutes, setEtaMinutes] = useState(5);
  const [activeView, setActiveView] = useState<"ride" | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ from: string; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [autoAssignOffer, setAutoAssignOffer] = useState<Order | null>(null);
  const declinedOrdersRef = useRef<Set<string>>(new Set());
  const [supportOpen, setSupportOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; action: () => void } | null>(null);
  const [supportInput, setSupportInput] = useState("");
  const prevSupportCountRef = useRef(supportMessages.length);
  const [driverChatMessages, setDriverChatMessages] = useState<{id: number; driverId: string; driverName: string; text: string; time: string; timestamp: number}[]>([]);
  const [driverChatInput, setDriverChatInput] = useState("");
  const [driverChatLoading, setDriverChatLoading] = useState(false);
  const prevDriverChatCountRef = useRef(0);

  const subActive = isSubscriptionActive(driver);
  const subDays = subscriptionDaysLeft(driver);
  const canWork = subActive || driver.freeWork;

  const myOrder = orders.find(
    (o) => o.driverId === driver.id && !["done", "cancelled"].includes(o.status)
  );

  const now = Date.now();
  const freeOrders = orders
    .filter((o) => o.status === "pending" && o.freeAt && now - o.freeAt >= settings.freeOrderTimeoutMs)
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

  const isRestricted = driver.status === "restricted";
  const carFilled = driver.carInfo.brand && driver.carInfo.model && driver.carInfo.plateNumber;

  const mySupportMessages = supportMessages.filter(
    (m) => m.fromId === userId || (m.fromRole === "admin" && m.fromId === userId)
  );

  const supportUnread = mySupportMessages.filter((m) => m.fromRole === "admin" && !m.read).length;

  useEffect(() => {
    if (supportMessages.length > prevSupportCountRef.current) {
      const newMsgs = supportMessages.slice(prevSupportCountRef.current);
      const incoming = newMsgs.filter((m) => m.fromRole === "admin" && m.fromId === userId);
      if (incoming.length > 0) {
        playNotificationSound("message");
        sendPush("Поддержка", incoming[incoming.length - 1].text.slice(0, 80));
      }
    }
    prevSupportCountRef.current = supportMessages.length;
  }, [supportMessages, userId]);

  useEffect(() => {
    if (supportOpen) {
      onMarkMessagesRead(userId, "driver");
    }
  }, [supportOpen, userId, onMarkMessagesRead]);

  useEffect(() => {
    if (!driver.autoAssign || isRestricted || myOrder || !carFilled || !canWork) return;
    const pendingOrders = orders.filter(
      (o) => o.status === "pending" && !o.driverId && !declinedOrdersRef.current.has(o.id)
    );
    if (pendingOrders.length > 0 && !autoAssignOffer) {
      const nearest = pendingOrders.sort(
        (a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0)
      )[0];
      setAutoAssignOffer(nearest);
      playNotificationSound("order");
      sendPush("Taxi", "Новый заказ!");
    }
  }, [orders, driver.autoAssign, isRestricted, myOrder, carFilled, autoAssignOffer, canWork]);

  useEffect(() => {
    const loadChat = async () => {
      const res = await api.getDriverChat();
      if (res?.messages) {
        setDriverChatMessages(res.messages);
      }
    };
    loadChat();
    const interval = setInterval(loadChat, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (driverChatMessages.length > prevDriverChatCountRef.current && prevDriverChatCountRef.current > 0) {
      const lastMsg = driverChatMessages[driverChatMessages.length - 1];
      if (lastMsg && lastMsg.driverId !== driver.id) {
        playNotificationSound("message");
        sendPush("Чат водителей", `${lastMsg.driverName}: ${lastMsg.text}`);
      }
    }
    prevDriverChatCountRef.current = driverChatMessages.length;
  }, [driverChatMessages, driver.id]);

  const handleSaveCar = () => {
    if (!carBrand.trim() || !carModel.trim() || !carPlate.trim()) return;
    onUpdateDriverCar(driver.id, {
      brand: carBrand.trim(),
      model: carModel.trim(),
      plateNumber: carPlate.trim(),
    });
    setEditingCar(false);
  };

  const handleAcceptFromEta = (orderId: string, eta: number) => {
    onAcceptOrder(orderId, driver.id, driver.name, eta);
    setEtaSelect(null);
    setEtaMinutes(5);
    setActiveView("ride");
    setAutoAssignOffer(null);
  };

  const handleDeclineAutoAssign = () => {
    if (autoAssignOffer) {
      declinedOrdersRef.current.add(autoAssignOffer.id);
    }
    setAutoAssignOffer(null);
  };

  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [...prev, { from: "driver", text: chatInput }]);
    setChatInput("");
    setTimeout(() => {
      setChatMessages((prev) => [...prev, { from: "passenger", text: "Хорошо, жду!" }]);
    }, 1500);
  };

  const sendSupportMessage = () => {
    if (!supportInput.trim()) return;
    const msg: SupportMessage = {
      id: `sm_${Date.now()}`,
      fromId: userId,
      fromName: driver.name,
      fromRole: "driver",
      text: supportInput.trim(),
      time: new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
      timestamp: Date.now(),
      read: false,
    };
    onSendSupport(msg);
    setSupportInput("");
  };

  const handleStatusChange = (orderId: string, nextStatus: Order["status"]) => {
    onUpdateOrderStatus(orderId, nextStatus);
    if (nextStatus === "done") {
      setActiveView(null);
      setChatOpen(false);
      setChatMessages([]);
    }
  };

  const handleCancelOrder = (orderId: string) => {
    onUpdateOrderStatus(orderId, "cancelled");
    setActiveView(null);
    setChatOpen(false);
    setChatMessages([]);
  };

  const sendDriverChatMessage = async () => {
    if (!driverChatInput.trim() || driverChatLoading) return;
    setDriverChatLoading(true);
    const text = driverChatInput.trim();
    setDriverChatInput("");
    const res = await api.sendDriverChat(driver.id, driver.name, text);
    if (res?.id) {
      setDriverChatMessages((prev) => [...prev, { id: res.id, driverId: driver.id, driverName: driver.name, text, time: res.time, timestamp: res.timestamp }]);
    }
    setDriverChatLoading(false);
  };

  if (supportOpen) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--taxi-dark)" }}>
        <div style={{ padding: "14px var(--page-px)", borderBottom: "1px solid var(--taxi-border)", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setSupportOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--taxi-yellow)" }}>
            <Icon name="ArrowLeft" size={20} />
          </button>
          <img src={LOGO_URL} alt="" style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover" }} />
          <div>
            <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, color: "#F0F2F5" }}>Поддержка</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div className="animate-blink" style={{ width: 6, height: 6, background: "var(--taxi-green)", borderRadius: "50%" }} />
              <span style={{ fontSize: 11, color: "var(--taxi-green)" }}>Онлайн</span>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--page-px)", display: "flex", flexDirection: "column", gap: 10 }}>
          {mySupportMessages.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--taxi-muted)", fontSize: 13, marginTop: 40 }}>Напишите в поддержку</div>
          )}
          {mySupportMessages.map((msg) => (
            <div key={msg.id} style={{ display: "flex", justifyContent: msg.fromRole === "driver" ? "flex-end" : "flex-start" }}>
              {msg.fromRole === "admin" && (
                <div style={{ width: 28, height: 28, marginRight: 8, flexShrink: 0, alignSelf: "flex-end" }}>
                  <img src={LOGO_URL} alt="" style={{ width: 28, height: 28, borderRadius: 8, objectFit: "cover" }} />
                </div>
              )}
              <div style={{
                maxWidth: "75%", padding: "10px 14px",
                borderRadius: msg.fromRole === "driver" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: msg.fromRole === "driver" ? "var(--taxi-yellow)" : "var(--taxi-card)",
                border: msg.fromRole === "driver" ? "none" : "1px solid var(--taxi-border)",
              }}>
                <p style={{ fontSize: 14, color: msg.fromRole === "driver" ? "var(--taxi-dark)" : "#F0F2F5", lineHeight: 1.5, margin: 0 }}>{msg.text}</p>
                <p style={{ fontSize: 10, color: msg.fromRole === "driver" ? "rgba(13,15,20,0.5)" : "var(--taxi-muted)", margin: "4px 0 0" }}>{msg.time}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "12px var(--page-px) 20px", borderTop: "1px solid var(--taxi-border)", display: "flex", gap: 10 }}>
          <input className="taxi-input" placeholder="Напишите сообщение..." value={supportInput} onChange={(e) => setSupportInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendSupportMessage()} style={{ flex: 1 }} />
          <button onClick={sendSupportMessage} style={{ width: 50, height: 50, background: "var(--taxi-yellow)", border: "none", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <Icon name="Send" size={20} color="var(--taxi-dark)" />
          </button>
        </div>
      </div>
    );
  }

  if (etaSelect) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--taxi-dark)", padding: 24, alignItems: "center", justifyContent: "center" }}>
        <div className="animate-fade-slide-up" style={{ textAlign: "center", width: "100%", maxWidth: 340 }}>
          <Icon name="Timer" size={48} color="var(--taxi-yellow)" />
          <div style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 20, color: "#F0F2F5", marginBottom: 8, marginTop: 16 }}>
            Время до клиента?
          </div>
          <div style={{ fontSize: 13, color: "var(--taxi-muted)", marginBottom: 28 }}>Выберите примерное время прибытия</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 28 }}>
            <button
              onClick={() => setEtaMinutes((v) => Math.max(1, v - 1))}
              style={{
                width: 52, height: 52, borderRadius: "50%", background: "var(--taxi-surface)",
                border: "1.5px solid var(--taxi-border)", cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--taxi-yellow)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--taxi-border)"; }}
            >
              <Icon name="Minus" size={22} color="#F0F2F5" />
            </button>
            <div style={{ minWidth: 80, textAlign: "center" }}>
              <div style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 48, color: "var(--taxi-yellow)", lineHeight: 1 }}>{etaMinutes}</div>
              <div style={{ fontSize: 13, color: "var(--taxi-muted)", marginTop: 4 }}>минут</div>
            </div>
            <button
              onClick={() => setEtaMinutes((v) => Math.min(30, v + 1))}
              style={{
                width: 52, height: 52, borderRadius: "50%", background: "var(--taxi-surface)",
                border: "1.5px solid var(--taxi-border)", cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--taxi-yellow)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--taxi-border)"; }}
            >
              <Icon name="Plus" size={22} color="#F0F2F5" />
            </button>
          </div>
          <button
            onClick={() => setConfirmAction({ type: "accept", action: () => handleAcceptFromEta(etaSelect.orderId, etaMinutes) })}
            style={{
              width: "100%", padding: "14px", background: "var(--taxi-yellow)", border: "none",
              borderRadius: 14, color: "var(--taxi-dark)", fontFamily: "Montserrat", fontWeight: 700,
              fontSize: 15, cursor: "pointer", marginBottom: 10,
            }}
          >
            Подтвердить
          </button>
          <button onClick={() => { setEtaSelect(null); setEtaMinutes(5); }}
            style={{ width: "100%", background: "transparent", border: "1px solid var(--taxi-border)", borderRadius: 14, padding: "12px 24px", color: "var(--taxi-muted)", fontSize: 13, cursor: "pointer", fontFamily: "Montserrat", fontWeight: 600 }}>
            Назад
          </button>
        </div>
        {confirmAction && (
          <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--page-px)" }}>
            <div className="taxi-card animate-fade-slide-up" style={{ maxWidth: 320, width: "100%", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>
                {confirmAction.type === "cancel" ? "\u26A0\uFE0F" : confirmAction.type === "accept" ? "\uD83D\uDE96" : confirmAction.type === "done" ? "\u2705" : "\u2753"}
              </div>
              <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 16, color: "#F0F2F5", marginBottom: 6 }}>
                {confirmAction.type === "cancel" ? "Отменить заказ?" : confirmAction.type === "accept" ? "Принять заказ?" : confirmAction.type === "done" ? "Завершить поездку?" : "Подтвердить?"}
              </div>
              <div style={{ fontSize: 13, color: "var(--taxi-muted)", marginBottom: 16 }}>
                {confirmAction.type === "cancel" ? "Вы уверены, что хотите отменить?" : confirmAction.type === "accept" ? "Подтвердите принятие заказа" : confirmAction.type === "done" ? "Поездка будет завершена" : "Подтвердите действие"}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setConfirmAction(null)} style={{ flex: 1, padding: "12px", background: "var(--taxi-surface)", border: "1px solid var(--taxi-border)", borderRadius: 12, color: "var(--taxi-muted)", fontSize: 14, cursor: "pointer", fontFamily: "Montserrat", fontWeight: 600 }}>
                  Назад
                </button>
                <button onClick={() => { confirmAction.action(); setConfirmAction(null); }} style={{ flex: 1, padding: "12px", background: confirmAction.type === "cancel" ? "rgba(239,68,68,0.2)" : "var(--taxi-yellow)", border: confirmAction.type === "cancel" ? "1px solid rgba(239,68,68,0.4)" : "none", borderRadius: 12, color: confirmAction.type === "cancel" ? "var(--taxi-red)" : "var(--taxi-dark)", fontSize: 14, cursor: "pointer", fontFamily: "Montserrat", fontWeight: 700 }}>
                  {confirmAction.type === "cancel" ? "Да, отменить" : "Подтвердить"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (autoAssignOffer && !myOrder) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--taxi-dark)", padding: "var(--page-px)" }}>
        <div className="animate-fade-slide-up" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%", background: "rgba(255,204,0,0.15)",
            border: "3px solid var(--taxi-yellow)", display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 20, animation: "pulse 1.5s infinite",
          }}>
            <Icon name="Bell" size={36} color="var(--taxi-yellow)" />
          </div>
          <div style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 20, color: "#F0F2F5", marginBottom: 6, textAlign: "center" }}>
            Новый заказ!
          </div>
          <div style={{ fontSize: 13, color: "var(--taxi-muted)", marginBottom: 24, textAlign: "center" }}>Авто-назначение</div>

          <div className="taxi-card" style={{ width: "100%", marginBottom: 20 }}>
            {autoAssignOffer.tariff === "delivery" ? (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "var(--taxi-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>Доставка</div>
                <div style={{ fontSize: 14, color: "#F0F2F5" }}>{autoAssignOffer.options.deliveryDescription}</div>
                <div style={{ fontSize: 12, color: "var(--taxi-muted)", marginTop: 4 }}>{autoAssignOffer.to}</div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 3 }}>
                  <div style={{ width: 9, height: 9, background: "var(--taxi-green)", borderRadius: "50%" }} />
                  <div style={{ width: 1, flex: 1, background: "var(--taxi-border)", margin: "4px 0" }} />
                  <div style={{ width: 9, height: 9, background: "var(--taxi-yellow)", borderRadius: 2 }} />
                </div>
                <div>
                  <div style={{ fontSize: 14, color: "#F0F2F5", marginBottom: 8 }}>{autoAssignOffer.from}</div>
                  <div style={{ fontSize: 14, color: "var(--taxi-muted)" }}>{autoAssignOffer.to}</div>
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-muted)" }}>{autoAssignOffer.passengerName}</span>
              <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-muted)" }}>{TARIFF_LABELS[autoAssignOffer.tariff]}</span>
              <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-muted)" }}>{PAYMENT_LABELS[autoAssignOffer.paymentMethod]}</span>
              {autoAssignOffer.distanceKm > 0 && (
                <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-muted)" }}>{autoAssignOffer.distanceKm} km</span>
              )}
              {autoAssignOffer.tips > 0 && (
                <span style={{ fontSize: 11, padding: "3px 8px", background: "rgba(34,197,94,0.15)", borderRadius: 6, color: "var(--taxi-green)", fontWeight: 600 }}>+{autoAssignOffer.tips} ₽ чай</span>
              )}
              {autoAssignOffer.options.children && <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-yellow)" }}>Дети: {autoAssignOffer.options.childrenCount}</span>}
              {autoAssignOffer.options.luggage && <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-yellow)" }}>Багаж</span>}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, width: "100%" }}>
            <button onClick={handleDeclineAutoAssign}
              style={{ flex: 1, padding: "14px", background: "transparent", border: "1px solid var(--taxi-red)", borderRadius: 14, color: "var(--taxi-red)", fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              Отказаться
            </button>
            <button onClick={() => setEtaSelect({ orderId: autoAssignOffer.id })}
              style={{ flex: 1, padding: "14px", background: "var(--taxi-yellow)", border: "none", borderRadius: 14, color: "var(--taxi-dark)", fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              Взять в работу
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeView === "ride" && myOrder) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--taxi-dark)" }}>
        {chatOpen ? (
          <>
            <div style={{ padding: "14px var(--page-px)", borderBottom: "1px solid var(--taxi-border)", display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setChatOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--taxi-yellow)" }}>
                <Icon name="ArrowLeft" size={20} />
              </button>
              <div style={{ width: 36, height: 36, background: "var(--taxi-yellow)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="User" size={18} color="var(--taxi-dark)" />
              </div>
              <div>
                <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, color: "#F0F2F5" }}>{myOrder.passengerName}</div>
                <div style={{ fontSize: 11, color: "var(--taxi-green)" }}>Онлайн</div>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "var(--page-px)", display: "flex", flexDirection: "column", gap: 10 }}>
              {chatMessages.length === 0 && (
                <div style={{ textAlign: "center", color: "var(--taxi-muted)", fontSize: 13, marginTop: 40 }}>Напишите пассажиру</div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ display: "flex", justifyContent: msg.from === "driver" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "75%", padding: "10px 14px",
                    borderRadius: msg.from === "driver" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background: msg.from === "driver" ? "var(--taxi-yellow)" : "var(--taxi-card)",
                    color: msg.from === "driver" ? "var(--taxi-dark)" : "#F0F2F5", fontSize: 14,
                    border: msg.from === "driver" ? "none" : "1px solid var(--taxi-border)",
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "12px var(--page-px) 20px", borderTop: "1px solid var(--taxi-border)", display: "flex", gap: 10 }}>
              <input className="taxi-input" placeholder="Сообщение..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendChatMessage()} style={{ flex: 1 }} />
              <button onClick={sendChatMessage} style={{ width: 50, height: 50, background: "var(--taxi-yellow)", border: "none", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Icon name="Send" size={20} color="var(--taxi-dark)" />
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ padding: "14px var(--page-px)", borderBottom: "1px solid var(--taxi-border)", display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setActiveView(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--taxi-yellow)" }}>
                <Icon name="ArrowLeft" size={20} />
              </button>
              <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 16, color: "#F0F2F5" }}>Активный заказ</div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "var(--page-px)" }}>
              <div className="taxi-card animate-fade-slide-up" style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span className="animate-blink" style={{ color: getStatusColor(myOrder.status), fontSize: 10 }}>●</span>
                  <span style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, color: getStatusColor(myOrder.status) }}>
                    {getStatusLabel(myOrder.status)}
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-muted)" }}>{TARIFF_LABELS[myOrder.tariff]}</span>
                </div>

                {myOrder.tariff === "delivery" ? (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 13, color: "#F0F2F5" }}>{myOrder.options.deliveryDescription}</div>
                    <div style={{ fontSize: 12, color: "var(--taxi-muted)", marginTop: 4 }}>{myOrder.to}</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 3 }}>
                      <div style={{ width: 8, height: 8, background: "var(--taxi-green)", borderRadius: "50%" }} />
                      <div style={{ width: 1, flex: 1, background: "var(--taxi-border)", margin: "3px 0" }} />
                      <div style={{ width: 8, height: 8, background: "var(--taxi-yellow)", borderRadius: 2 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: "#F0F2F5", marginBottom: 6 }}>{myOrder.from}</div>
                      <div style={{ fontSize: 13, color: "var(--taxi-muted)" }}>{myOrder.to}</div>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {myOrder.distanceKm > 0 && (
                    <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-muted)" }}>{myOrder.distanceKm} km</span>
                  )}
                  {myOrder.price != null && (
                    <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "#F0F2F5", fontWeight: 600 }}>{myOrder.price} ₽</span>
                  )}
                </div>

                {(myOrder.options.children || myOrder.options.luggage || myOrder.options.comment) && (
                  <div style={{ marginTop: 10, padding: "8px 10px", background: "var(--taxi-surface)", borderRadius: 10 }}>
                    {myOrder.options.children && (
                      <div style={{ fontSize: 12, color: "var(--taxi-yellow)", marginBottom: 4 }}>Дети: {myOrder.options.childrenCount}</div>
                    )}
                    {myOrder.options.luggage && (
                      <div style={{ fontSize: 12, color: "var(--taxi-yellow)", marginBottom: 4 }}>Багаж</div>
                    )}
                    {myOrder.options.comment && (
                      <div style={{ fontSize: 12, color: "var(--taxi-muted)", fontStyle: "italic" }}>{myOrder.options.comment}</div>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                  <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-muted)" }}>{myOrder.passengerName}</span>
                  <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-muted)" }}>{PAYMENT_LABELS[myOrder.paymentMethod]}</span>
                  {myOrder.tips > 0 && (
                    <span style={{ fontSize: 11, padding: "3px 8px", background: "rgba(34,197,94,0.15)", borderRadius: 6, color: "var(--taxi-green)", fontWeight: 600 }}>+{myOrder.tips} ₽ чай</span>
                  )}
                  {myOrder.etaMinutes != null && myOrder.status === "assigned" && (
                    <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-muted)" }}>~{myOrder.etaMinutes} мин</span>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                {myOrder.passengerPhone ? (
                  <a href={`tel:${myOrder.passengerPhone}`} style={{
                    flex: 1, padding: "12px", background: "var(--taxi-surface)", border: "1px solid var(--taxi-border)",
                    borderRadius: 14, color: "#F0F2F5", fontSize: 13, cursor: "pointer", fontFamily: "Montserrat",
                    fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, textDecoration: "none",
                  }}>
                    <Icon name="Phone" size={16} color="var(--taxi-yellow)" /> Позвонить
                  </a>
                ) : (
                  <button disabled style={{
                    flex: 1, padding: "12px", background: "var(--taxi-surface)", border: "1px solid var(--taxi-border)",
                    borderRadius: 14, color: "var(--taxi-muted)", fontSize: 13, cursor: "not-allowed", fontFamily: "Montserrat",
                    fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}>
                    <Icon name="Phone" size={16} color="var(--taxi-muted)" /> Позвонить
                  </button>
                )}
                <button onClick={() => setChatOpen(true)}
                  style={{ flex: 1, padding: "12px", background: "var(--taxi-surface)", border: "1px solid var(--taxi-border)", borderRadius: 14, color: "#F0F2F5", fontSize: 13, cursor: "pointer", fontFamily: "Montserrat", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Icon name="MessageCircle" size={16} color="var(--taxi-yellow)" /> Чат
                </button>
              </div>

              <RideActionButtons order={myOrder} onStatusChange={(orderId, status) => {
                if (status === "done") {
                  setConfirmAction({ type: "done", action: () => handleStatusChange(orderId, status) });
                } else {
                  handleStatusChange(orderId, status);
                }
              }} />

              <button onClick={() => setConfirmAction({ type: "cancel", action: () => handleCancelOrder(myOrder.id) })}
                style={{
                  width: "100%", padding: "12px", background: "transparent", border: "1px solid var(--taxi-red)",
                  borderRadius: 14, color: "var(--taxi-red)", fontFamily: "Montserrat", fontWeight: 600,
                  fontSize: 13, cursor: "pointer", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                <Icon name="X" size={16} color="var(--taxi-red)" /> Снять заказ
              </button>
            </div>
          </>
        )}
        {confirmAction && (
          <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--page-px)" }}>
            <div className="taxi-card animate-fade-slide-up" style={{ maxWidth: 320, width: "100%", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>
                {confirmAction.type === "cancel" ? "\u26A0\uFE0F" : confirmAction.type === "accept" ? "\uD83D\uDE96" : confirmAction.type === "done" ? "\u2705" : "\u2753"}
              </div>
              <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 16, color: "#F0F2F5", marginBottom: 6 }}>
                {confirmAction.type === "cancel" ? "Отменить заказ?" : confirmAction.type === "accept" ? "Принять заказ?" : confirmAction.type === "done" ? "Завершить поездку?" : "Подтвердить?"}
              </div>
              <div style={{ fontSize: 13, color: "var(--taxi-muted)", marginBottom: 16 }}>
                {confirmAction.type === "cancel" ? "Вы уверены, что хотите отменить?" : confirmAction.type === "accept" ? "Подтвердите принятие заказа" : confirmAction.type === "done" ? "Поездка будет завершена" : "Подтвердите действие"}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setConfirmAction(null)} style={{ flex: 1, padding: "12px", background: "var(--taxi-surface)", border: "1px solid var(--taxi-border)", borderRadius: 12, color: "var(--taxi-muted)", fontSize: 14, cursor: "pointer", fontFamily: "Montserrat", fontWeight: 600 }}>
                  Назад
                </button>
                <button onClick={() => { confirmAction.action(); setConfirmAction(null); }} style={{ flex: 1, padding: "12px", background: confirmAction.type === "cancel" ? "rgba(239,68,68,0.2)" : "var(--taxi-yellow)", border: confirmAction.type === "cancel" ? "1px solid rgba(239,68,68,0.4)" : "none", borderRadius: 12, color: confirmAction.type === "cancel" ? "var(--taxi-red)" : "var(--taxi-dark)", fontSize: 14, cursor: "pointer", fontFamily: "Montserrat", fontWeight: 700 }}>
                  {confirmAction.type === "cancel" ? "Да, отменить" : "Подтвердить"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--taxi-dark)" }}>
      {confirmAction && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--page-px)" }}>
          <div className="taxi-card animate-fade-slide-up" style={{ maxWidth: 320, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>
              {confirmAction.type === "cancel" ? "\u26A0\uFE0F" : confirmAction.type === "accept" ? "\uD83D\uDE96" : confirmAction.type === "done" ? "\u2705" : "\u2753"}
            </div>
            <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 16, color: "#F0F2F5", marginBottom: 6 }}>
              {confirmAction.type === "cancel" ? "Отменить заказ?" : confirmAction.type === "accept" ? "Принять заказ?" : confirmAction.type === "done" ? "Завершить поездку?" : "Подтвердить?"}
            </div>
            <div style={{ fontSize: 13, color: "var(--taxi-muted)", marginBottom: 16 }}>
              {confirmAction.type === "cancel" ? "Вы уверены, что хотите отменить?" : confirmAction.type === "accept" ? "Подтвердите принятие заказа" : confirmAction.type === "done" ? "Поездка будет завершена" : "Подтвердите действие"}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmAction(null)} style={{ flex: 1, padding: "12px", background: "var(--taxi-surface)", border: "1px solid var(--taxi-border)", borderRadius: 12, color: "var(--taxi-muted)", fontSize: 14, cursor: "pointer", fontFamily: "Montserrat", fontWeight: 600 }}>
                Назад
              </button>
              <button onClick={() => { confirmAction.action(); setConfirmAction(null); }} style={{ flex: 1, padding: "12px", background: confirmAction.type === "cancel" ? "rgba(239,68,68,0.2)" : "var(--taxi-yellow)", border: confirmAction.type === "cancel" ? "1px solid rgba(239,68,68,0.4)" : "none", borderRadius: 12, color: confirmAction.type === "cancel" ? "var(--taxi-red)" : "var(--taxi-dark)", fontSize: 14, cursor: "pointer", fontFamily: "Montserrat", fontWeight: 700 }}>
                {confirmAction.type === "cancel" ? "Да, отменить" : "Подтвердить"}
              </button>
            </div>
          </div>
        </div>
      )}
      {tab !== "chat" && (
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: 80 }}>
          {tab === "profile" && (
            <div className="animate-fade-slide-up" style={{ padding: "var(--page-pt) var(--page-px) 0" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <div style={{
                  width: 80, height: 80, background: "var(--taxi-yellow)", borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 32, color: "var(--taxi-dark)" }}>
                    {driver.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div style={{ textAlign: "center" }}>
                  <h2 style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 20, color: "#F0F2F5", marginBottom: 4 }}>{driver.name}</h2>
                  <div style={{ fontSize: 13, color: "var(--taxi-muted)" }}>{driver.phone}</div>
                </div>
              </div>

              {isRestricted && (
                <div style={{ padding: "12px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 14, marginBottom: 14, fontSize: 13, color: "var(--taxi-red)", lineHeight: 1.5 }}>
                  <Icon name="AlertTriangle" size={14} /> Ваш аккаунт ограничен администратором. Обратитесь в поддержку.
                </div>
              )}

              {!canWork && (
                <div style={{ padding: "12px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 14, marginBottom: 14, fontSize: 13, color: "var(--taxi-red)", lineHeight: 1.5 }}>
                  <Icon name="AlertTriangle" size={14} /> Подписка истекла. Обратитесь к администратору для продления.
                </div>
              )}

              <div style={{ fontSize: 11, color: "var(--taxi-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Данные автомобиля</div>
              {editingCar ? (
                <div className="taxi-card" style={{ marginBottom: 14 }}>
                  <input className="taxi-input" placeholder="Марка (Toyota, Kia...)" value={carBrand} onChange={(e) => setCarBrand(e.target.value)} style={{ marginBottom: 8 }} />
                  <input className="taxi-input" placeholder="Модель (Camry, Rio...)" value={carModel} onChange={(e) => setCarModel(e.target.value)} style={{ marginBottom: 8 }} />
                  <input className="taxi-input" placeholder="Госномер (А123БВ)" value={carPlate} onChange={(e) => setCarPlate(e.target.value)} style={{ marginBottom: 12 }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setEditingCar(false)} style={{ flex: 1, padding: "10px", background: "var(--taxi-surface)", border: "1px solid var(--taxi-border)", borderRadius: 12, color: "var(--taxi-muted)", fontSize: 13, cursor: "pointer", fontFamily: "Montserrat", fontWeight: 600 }}>
                      Отмена
                    </button>
                    <button onClick={handleSaveCar} disabled={!carBrand.trim() || !carModel.trim() || !carPlate.trim()}
                      style={{ flex: 1, padding: "10px", background: "var(--taxi-yellow)", border: "none", borderRadius: 12, color: "var(--taxi-dark)", fontSize: 13, cursor: "pointer", fontFamily: "Montserrat", fontWeight: 700, opacity: (!carBrand.trim() || !carModel.trim() || !carPlate.trim()) ? 0.5 : 1 }}>
                      Сохранить
                    </button>
                  </div>
                </div>
              ) : (
                <div className="taxi-card" style={{ marginBottom: 14, cursor: "pointer" }} onClick={() => setEditingCar(true)}>
                  {carFilled ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 15, color: "#F0F2F5", fontWeight: 600 }}>{driver.carInfo.brand} {driver.carInfo.model}</div>
                        <div style={{ fontSize: 13, color: "var(--taxi-muted)", marginTop: 2 }}>{driver.carInfo.plateNumber}</div>
                      </div>
                      <Icon name="Pencil" size={16} color="var(--taxi-yellow)" />
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--taxi-red)" }}>
                      <Icon name="AlertCircle" size={18} />
                      <span style={{ fontSize: 13 }}>Заполните данные автомобиля для выхода на линию</span>
                    </div>
                  )}
                </div>
              )}

              <div className="taxi-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, background: driver.autoAssign && canWork ? "rgba(255,204,0,0.15)" : "var(--taxi-surface)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="Zap" size={20} color={driver.autoAssign && canWork ? "var(--taxi-yellow)" : "var(--taxi-muted)"} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, color: "#F0F2F5", fontWeight: 500 }}>Авто-назначение</div>
                    <div style={{ fontSize: 11, color: "var(--taxi-muted)", marginTop: 1 }}>
                      {!canWork ? "Подписка истекла" : driver.autoAssign ? `ON - радиус ${settings.autoAssignRadiusKm} км` : `OFF - радиус ${settings.autoAssignRadiusKm} км`}
                    </div>
                  </div>
                </div>
                <div onClick={() => !isRestricted && carFilled && canWork && onToggleAutoAssign(driver.id)}
                  style={{
                    width: 48, height: 28, background: driver.autoAssign && !isRestricted && canWork ? "var(--taxi-yellow)" : "var(--taxi-surface)",
                    borderRadius: 14, position: "relative", cursor: (isRestricted || !carFilled || !canWork) ? "not-allowed" : "pointer",
                    transition: "background 0.2s", border: `1px solid ${driver.autoAssign && !isRestricted && canWork ? "var(--taxi-yellow)" : "var(--taxi-border)"}`,
                    opacity: (isRestricted || !carFilled || !canWork) ? 0.5 : 1, flexShrink: 0,
                  }}>
                  <div style={{ position: "absolute", width: 22, height: 22, background: driver.autoAssign && !isRestricted && canWork ? "var(--taxi-dark)" : "#F0F2F5", borderRadius: "50%", top: 2, left: driver.autoAssign && !isRestricted && canWork ? 23 : 2, transition: "left 0.2s" }} />
                </div>
              </div>

              <button onClick={() => { setTab("orders"); }}
                style={{
                  width: "100%", padding: "14px 16px", background: "var(--taxi-surface)", border: "1px solid var(--taxi-border)",
                  borderRadius: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, marginBottom: 10, transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--taxi-yellow)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--taxi-border)")}
              >
                <div style={{ width: 40, height: 40, background: "rgba(255,204,0,0.15)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="ClipboardList" size={20} color="var(--taxi-yellow)" />
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: 14, color: "#F0F2F5", fontWeight: 600 }}>Свободные заказы</div>
                  <div style={{ fontSize: 12, color: "var(--taxi-muted)", marginTop: 1 }}>{freeOrders.length} доступно</div>
                </div>
                {freeOrders.length > 0 && (
                  <span style={{
                    minWidth: 22, height: 22, padding: "0 6px", borderRadius: 11, background: "var(--taxi-yellow)",
                    color: "var(--taxi-dark)", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {freeOrders.length}
                  </span>
                )}
                <Icon name="ChevronRight" size={18} color="var(--taxi-muted)" />
              </button>

              <button onClick={() => setSupportOpen(true)}
                style={{
                  width: "100%", padding: "14px 16px", background: "var(--taxi-surface)", border: "1px solid var(--taxi-border)",
                  borderRadius: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, marginBottom: 20, transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--taxi-yellow)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--taxi-border)")}
              >
                <div style={{ width: 40, height: 40, background: "rgba(255,204,0,0.15)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="MessageCircle" size={20} color="var(--taxi-yellow)" />
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: 14, color: "#F0F2F5", fontWeight: 600 }}>Поддержка</div>
                  <div style={{ fontSize: 12, color: "var(--taxi-muted)", marginTop: 1 }}>Чат с администратором</div>
                </div>
                <Icon name="ChevronRight" size={18} color="var(--taxi-muted)" />
              </button>

              <button onClick={onLogout}
                style={{
                  width: "100%", padding: "14px", background: "transparent", border: "1px solid var(--taxi-border)",
                  borderRadius: 14, color: "var(--taxi-red)", fontFamily: "Montserrat", fontWeight: 600, fontSize: 14,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                <Icon name="LogOut" size={18} color="var(--taxi-red)" /> Выйти
              </button>
            </div>
          )}

          {tab === "orders" && (
            <div style={{ padding: "var(--page-pt) var(--page-px) 0" }}>
              <h2 style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 20, color: "#F0F2F5", marginBottom: 4 }}>Свободные заказы</h2>
              <p style={{ fontSize: 13, color: "var(--taxi-muted)", marginBottom: 16 }}>{freeOrders.length} доступно</p>
              {myOrder && (
                <button onClick={() => setActiveView("ride")}
                  className="taxi-card animate-fade-slide-up"
                  style={{ width: "100%", cursor: "pointer", marginBottom: 14, border: "1.5px solid var(--taxi-yellow)", textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="animate-blink" style={{ color: "var(--taxi-green)", fontSize: 10 }}>●</span>
                    <span style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, color: "var(--taxi-yellow)" }}>У вас активный заказ</span>
                    <Icon name="ChevronRight" size={16} color="var(--taxi-yellow)" />
                  </div>
                </button>
              )}
              {freeOrders.length === 0 ? (
                <div style={{ textAlign: "center", paddingTop: 40 }}>
                  <Icon name="CheckCircle" size={48} color="var(--taxi-green)" />
                  <div style={{ fontFamily: "Montserrat", fontWeight: 600, fontSize: 16, color: "#F0F2F5", marginTop: 12 }}>Все заказы разобраны</div>
                  <div style={{ fontSize: 13, color: "var(--taxi-muted)", marginTop: 6 }}>Новые заказы появятся здесь</div>
                </div>
              ) : (
                freeOrders.map((order, idx) => (
                  <FreeOrderCard
                    key={order.id}
                    order={order}
                    idx={idx}
                    onAccept={() => {
                      if (!isRestricted && !myOrder && carFilled && canWork) setEtaSelect({ orderId: order.id });
                    }}
                    disabled={isRestricted || !!myOrder || !carFilled || !canWork}
                    disabledReason={!canWork ? "Подписка истекла" : undefined}
                  />
                ))
              )}
            </div>
          )}

          {tab === "history" && (
            <div style={{ padding: "var(--page-pt) var(--page-px) 0" }}>
              <h2 style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 20, color: "#F0F2F5", marginBottom: 4 }}>История заказов</h2>
              <p style={{ fontSize: 13, color: "var(--taxi-muted)", marginBottom: 16 }}>Все отработанные заказы</p>
              <DriverHistory orders={orders} driverId={driver.id} />
            </div>
          )}
        </div>
      )}

      {tab === "chat" && (
        <div style={{ display: "flex", flexDirection: "column", height: "calc(100% - 60px)" }}>
          <div style={{ padding: "var(--page-pt) var(--page-px) 8px" }}>
            <h2 style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 20, color: "#F0F2F5", marginBottom: 4 }}>Чат водителей</h2>
            <p style={{ fontSize: 13, color: "var(--taxi-muted)" }}>Общение между водителями</p>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px var(--page-px)", display: "flex", flexDirection: "column", gap: 8 }}>
            {driverChatMessages.length === 0 && (
              <div style={{ textAlign: "center", color: "var(--taxi-muted)", fontSize: 13, marginTop: 40 }}>
                <Icon name="MessageSquare" size={40} color="var(--taxi-muted)" />
                <div style={{ marginTop: 8 }}>Пока нет сообщений</div>
              </div>
            )}
            {driverChatMessages.map((msg) => {
              const isMe = msg.driverId === driver.id;
              return (
                <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                  {!isMe && (
                    <span style={{ fontSize: 11, color: "var(--taxi-yellow)", marginBottom: 2, fontWeight: 600 }}>{msg.driverName}</span>
                  )}
                  <div style={{
                    maxWidth: "80%", padding: "10px 14px",
                    borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background: isMe ? "var(--taxi-yellow)" : "var(--taxi-card)",
                    border: isMe ? "none" : "1px solid var(--taxi-border)",
                  }}>
                    <p style={{ fontSize: 14, color: isMe ? "var(--taxi-dark)" : "#F0F2F5", lineHeight: 1.5, margin: 0 }}>{msg.text}</p>
                    <p style={{ fontSize: 10, color: isMe ? "rgba(13,15,20,0.5)" : "var(--taxi-muted)", margin: "4px 0 0" }}>{msg.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ padding: "12px var(--page-px) 20px", borderTop: "1px solid var(--taxi-border)", display: "flex", gap: 10 }}>
            <input className="taxi-input" placeholder="Сообщение..." value={driverChatInput} onChange={(e) => setDriverChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendDriverChatMessage()} style={{ flex: 1 }} />
            <button onClick={sendDriverChatMessage} disabled={driverChatLoading} style={{ width: 50, height: 50, background: "var(--taxi-yellow)", border: "none", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", cursor: driverChatLoading ? "wait" : "pointer", opacity: driverChatLoading ? 0.6 : 1 }}>
              <Icon name="Send" size={20} color="var(--taxi-dark)" />
            </button>
          </div>
        </div>
      )}

      <div className="nav-bar">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${tab === item.id ? "active" : ""}`}
            onClick={() => setTab(item.id)}
          >
            <div style={{ position: "relative", display: "inline-flex" }}>
              <Icon name={item.icon} size={22} />
              {item.id === "chat" && supportUnread > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -5,
                    right: -8,
                    minWidth: 16,
                    height: 16,
                    background: "var(--taxi-red)",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    color: "#fff",
                    fontWeight: 700,
                    padding: "0 4px",
                  }}
                >
                  {supportUnread > 99 ? "99+" : supportUnread}
                </span>
              )}
            </div>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function getStatusLabel(status: Order["status"]): string {
  switch (status) {
    case "assigned": return "Едете к пассажиру";
    case "arrived": return "На месте";
    case "waiting": return "Ожидание";
    case "inprogress": return "В пути";
    default: return "";
  }
}

function getStatusColor(status: Order["status"]): string {
  switch (status) {
    case "assigned": return "var(--taxi-yellow)";
    case "arrived": return "var(--taxi-green)";
    case "waiting": return "#60A5FA";
    case "inprogress": return "var(--taxi-green)";
    default: return "var(--taxi-muted)";
  }
}

function RideActionButtons({ order, onStatusChange }: { order: Order; onStatusChange: (orderId: string, status: Order["status"]) => void }) {
  switch (order.status) {
    case "assigned":
      return (
        <button onClick={() => onStatusChange(order.id, "arrived")} className="btn-yellow">
          <Icon name="MapPin" size={16} /> На месте
        </button>
      );
    case "arrived":
      return (
        <button onClick={() => onStatusChange(order.id, "inprogress")}
          style={{ width: "100%", padding: "14px", background: "var(--taxi-green)", border: "none", borderRadius: 14, color: "#fff", fontFamily: "Montserrat", fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Icon name="Car" size={16} /> Поехали
        </button>
      );
    case "inprogress":
      return (
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => onStatusChange(order.id, "waiting")}
            style={{ flex: 1, padding: "14px", background: "var(--taxi-surface)", border: "1px solid var(--taxi-border)", borderRadius: 14, color: "#60A5FA", fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <Icon name="Pause" size={14} /> Ожидание
          </button>
          <button onClick={() => onStatusChange(order.id, "done")}
            style={{ flex: 1, padding: "14px", background: "var(--taxi-green)", border: "none", borderRadius: 14, color: "#fff", fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <Icon name="Check" size={14} /> Завершить
          </button>
        </div>
      );
    case "waiting":
      return (
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => onStatusChange(order.id, "inprogress")}
            style={{ flex: 1, padding: "14px", background: "var(--taxi-yellow)", border: "none", borderRadius: 14, color: "var(--taxi-dark)", fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <Icon name="Car" size={14} /> Продолжить
          </button>
          <button onClick={() => onStatusChange(order.id, "done")}
            style={{ flex: 1, padding: "14px", background: "var(--taxi-green)", border: "none", borderRadius: 14, color: "#fff", fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <Icon name="Check" size={14} /> Завершить
          </button>
        </div>
      );
    default:
      return null;
  }
}

function FreeOrderCard({ order, idx, onAccept, disabled, disabledReason }: { order: Order; idx: number; onAccept: () => void; disabled: boolean; disabledReason?: string }) {
  return (
    <div className="taxi-card animate-fade-slide-up" style={{ marginBottom: 10, animationDelay: `${idx * 0.07}s` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        {order.tariff === "delivery" ? (
          <div style={{ flex: 1, marginRight: 12 }}>
            <div style={{ fontSize: 11, color: "var(--taxi-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>Доставка</div>
            <div style={{ fontSize: 13, color: "#F0F2F5", lineHeight: 1.4 }}>{order.options.deliveryDescription}</div>
            <div style={{ fontSize: 12, color: "var(--taxi-muted)", marginTop: 4 }}>{order.to}</div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 3 }}>
              <div style={{ width: 8, height: 8, background: "var(--taxi-green)", borderRadius: "50%" }} />
              <div style={{ width: 1, height: 20, background: "var(--taxi-border)", margin: "3px 0" }} />
              <div style={{ width: 8, height: 8, background: "var(--taxi-yellow)", borderRadius: 2 }} />
            </div>
            <div>
              <div style={{ fontSize: 13, color: "#F0F2F5", marginBottom: 6 }}>{order.from}</div>
              <div style={{ fontSize: 13, color: "var(--taxi-muted)" }}>{order.to}</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-muted)" }}>{TARIFF_LABELS[order.tariff]}</span>
        {order.distanceKm > 0 && (
          <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-muted)" }}>{order.distanceKm} km</span>
        )}
        <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-muted)" }}>{order.passengerName}</span>
        <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-muted)" }}>{PAYMENT_LABELS[order.paymentMethod]}</span>
        {order.tips > 0 && (
          <span style={{ fontSize: 11, padding: "3px 8px", background: "rgba(34,197,94,0.15)", borderRadius: 6, color: "var(--taxi-green)", fontWeight: 600 }}>+{order.tips} ₽ чай</span>
        )}
        {order.options.children && <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-yellow)" }}>Дети: {order.options.childrenCount}</span>}
        {order.options.luggage && <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-yellow)" }}>Багаж</span>}
      </div>

      {order.options.comment && (
        <div style={{ padding: "7px 10px", background: "var(--taxi-surface)", borderRadius: 10, fontSize: 12, color: "var(--taxi-muted)", marginBottom: 10, fontStyle: "italic" }}>
          {order.options.comment}
        </div>
      )}

      <button onClick={onAccept} disabled={disabled}
        style={{
          width: "100%", padding: "12px", background: disabled ? "var(--taxi-surface)" : "var(--taxi-yellow)",
          border: `1px solid ${disabled ? "var(--taxi-border)" : "var(--taxi-yellow)"}`, borderRadius: 13,
          color: disabled ? "var(--taxi-muted)" : "var(--taxi-dark)", fontFamily: "Montserrat", fontWeight: 700,
          fontSize: 14, cursor: disabled ? "not-allowed" : "pointer",
        }}>
        {disabled ? (disabledReason || "Недоступно") : "Взять в работу"}
      </button>
    </div>
  );
}

function DriverHistory({ orders, driverId }: { orders: Order[]; driverId: string }) {
  const completed = orders.filter(
    (o) => o.driverId === driverId && (o.status === "done" || o.status === "cancelled")
  );

  if (completed.length === 0) {
    return (
      <div style={{ textAlign: "center", paddingTop: 40 }}>
        <Icon name="MapPinned" size={48} color="var(--taxi-muted)" />
        <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 16, color: "#F0F2F5", marginBottom: 6, marginTop: 12 }}>Пока нет завершённых заказов</div>
        <div style={{ fontSize: 13, color: "var(--taxi-muted)" }}>Они появятся здесь после первой поездки</div>
      </div>
    );
  }

  return (
    <>
      {completed.slice().reverse().map((trip, idx) => (
        <div key={trip.id} className="taxi-card animate-fade-slide-up" style={{ marginBottom: 10, animationDelay: `${idx * 0.07}s` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              {trip.tariff === "delivery" ? (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 13, color: "#F0F2F5" }}>Доставка</div>
                  <div style={{ fontSize: 12, color: "var(--taxi-muted)", marginTop: 2 }}>{trip.to}</div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 3 }}>
                    <div style={{ width: 7, height: 7, background: "var(--taxi-green)", borderRadius: "50%" }} />
                    <div style={{ width: 1, flex: 1, background: "var(--taxi-border)", margin: "3px 0" }} />
                    <div style={{ width: 7, height: 7, background: trip.status === "cancelled" ? "var(--taxi-red)" : "var(--taxi-yellow)", borderRadius: 2 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "#F0F2F5", marginBottom: 4 }}>{trip.from}</div>
                    <div style={{ fontSize: 13, color: "var(--taxi-muted)" }}>{trip.to}</div>
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "var(--taxi-muted)", background: "var(--taxi-surface)", padding: "3px 8px", borderRadius: 6 }}>{trip.createdAt}</span>
                <span style={{ fontSize: 11, color: "var(--taxi-muted)", background: "var(--taxi-surface)", padding: "3px 8px", borderRadius: 6 }}>{TARIFF_LABELS[trip.tariff]}</span>
                <span style={{ fontSize: 11, color: "var(--taxi-muted)", background: "var(--taxi-surface)", padding: "3px 8px", borderRadius: 6 }}>{trip.passengerName}</span>
                {trip.distanceKm > 0 && (
                  <span style={{ fontSize: 11, color: "var(--taxi-muted)", background: "var(--taxi-surface)", padding: "3px 8px", borderRadius: 6 }}>{trip.distanceKm} km</span>
                )}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10 }}>
              {trip.status === "cancelled" ? (
                <span style={{ fontSize: 12, color: "var(--taxi-red)", fontWeight: 600 }}>Отменён</span>
              ) : (
                <span style={{ fontSize: 12, color: "var(--taxi-green)", fontWeight: 600 }}>Завершён</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}