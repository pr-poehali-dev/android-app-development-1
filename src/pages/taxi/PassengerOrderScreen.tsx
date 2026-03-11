import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";
import YandexMap from "@/components/YandexMap";
import AddressInput from "@/components/AddressInput";
import { shortenAddress } from "@/lib/address";
import { Order, User, AppSettings, Driver, LOGO_URL, PaymentMethod, calcOrderPrice } from "./types";
import { playNotificationSound, sendPush } from "./notifications";
import api from "./api";

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
  const [unreadChat, setUnreadChat] = useState(0);
  const [etaMinutes, setEtaMinutes] = useState(5);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [tips, setTips] = useState(0);
  const [pickMode, setPickMode] = useState<"from" | "to" | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; action: () => void } | null>(null);
  const [fromCoords, setFromCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [toCoords, setToCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const showToast = (text: string, sub?: string) => {
    setToast({ text, sub });
    setTimeout(() => setToast(null), 4000);
  };

  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const active = orders.find(
      (o) => o.passengerId === user.id && !["done", "cancelled"].includes(o.status) && !(o.status === "pending" && o.scheduledAt)
    );
    if (active) {
      setActiveOrderId(active.id);
      setFrom(active.from || "");
      setTo(active.to || "");
      setTariff(active.tariff);
      const statusToStep: Record<string, OrderStep> = {
        pending: "searching",
        assigned: "found",
        waiting: "found",
        arrived: "arrived",
        inprogress: "inprogress",
      };
      setStep(statusToStep[active.status] || "searching");
      if (active.etaMinutes) setEtaMinutes(active.etaMinutes);
    }
  }, [orders, user.id]);

  const autoLocatedRef = useRef(false);
  useEffect(() => {
    if (autoLocatedRef.current || step !== "form" || from) return;
    autoLocatedRef.current = true;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setFromCoords({ lat: latitude, lng: longitude });
        try {
          await new Promise<void>((resolve) => {
            if (window.ymaps) window.ymaps.ready(() => resolve());
            else resolve();
          });
          if (window.ymaps) {
            const res = await window.ymaps.geocode([latitude, longitude], { results: 1 });
            const obj = res?.geoObjects?.get(0);
            if (obj) setFrom(shortenAddress(obj.getAddressLine()));
          }
        } catch (_e) { void _e; }
      },
      () => {},
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, [step, from]);

  useEffect(() => {
    if (step === "found") {
      setEtaMinutes((prev) => prev || Math.floor(Math.random() * 6) + 3);
      showToast("Водитель найден!", "Едет к вам");
      playNotificationSound("arrive");
      sendPush("Taxi", "Водитель найден и едет к вам!");
    }
    if (step === "arrived") {
      playNotificationSound("arrive");
      sendPush("Taxi", "Водитель на месте!");
    }
  }, [step]);

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setFromCoords({ lat: latitude, lng: longitude });
        try {
          await new Promise<void>((resolve) => {
            if (window.ymaps) window.ymaps.ready(() => resolve());
            else resolve();
          });
          if (window.ymaps) {
            const res = await window.ymaps.geocode([latitude, longitude], { results: 1 });
            const obj = res?.geoObjects?.get(0);
            if (obj) setFrom(shortenAddress(obj.getAddressLine()));
            else setFrom(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          } else {
            setFrom(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          }
        } catch {
          setFrom(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        }
        setLocating(false);
      },
      () => {
        setLocating(false);
        showToast("Не удалось определить", "Разрешите доступ к геолокации");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeAddress = useCallback(async (address: string): Promise<{ lat: number; lng: number } | null> => {
    if (!address || address.length < 3 || !window.ymaps) return null;
    try {
      await new Promise<void>((resolve) => window.ymaps.ready(() => resolve()));
      const res = await window.ymaps.geocode(address, { results: 1 });
      const obj = res?.geoObjects?.get(0);
      if (!obj) return null;
      const coords = obj.geometry.getCoordinates();
      return { lat: coords[0], lng: coords[1] };
    } catch {
      return null;
    }
  }, []);

  const calcRoute = useCallback(async (fCoords: { lat: number; lng: number }, tCoords: { lat: number; lng: number }) => {
    if (!window.ymaps) return;
    setRouteLoading(true);
    try {
      await new Promise<void>((resolve) => window.ymaps.ready(() => resolve()));
      const route = await window.ymaps.route(
        [[fCoords.lat, fCoords.lng], [tCoords.lat, tCoords.lng]],
        { mapStateAutoApply: false }
      );
      const dist = route.getLength() / 1000;
      setRouteDistanceKm(Math.round(dist * 10) / 10);
    } catch {
      const R = 6371;
      const dLat = ((tCoords.lat - fCoords.lat) * Math.PI) / 180;
      const dLng = ((tCoords.lng - fCoords.lng) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos((fCoords.lat * Math.PI) / 180) * Math.cos((tCoords.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      const straight = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      setRouteDistanceKm(Math.round(straight * 1.3 * 10) / 10);
    }
    setRouteLoading(false);
  }, []);

  useEffect(() => {
    if (step !== "form" || tariff === "delivery") return;
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    if (!from || from.length < 3 || !to || to.length < 3) {
      setRouteDistanceKm(null);
      return;
    }
    geocodeTimerRef.current = setTimeout(async () => {
      const fC = fromCoords || await geocodeAddress(from);
      if (fC && !fromCoords) setFromCoords(fC);
      const tC = await geocodeAddress(to);
      if (tC) setToCoords(tC);
      if (fC && tC) await calcRoute(fC, tC);
    }, 600);
    return () => { if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current); };
  }, [from, to, tariff, step, fromCoords, geocodeAddress, calcRoute]);

  const activeOrder = orders.find((o) => o.id === activeOrderId);
  const assignedDriver = activeOrder?.driverId ? drivers.find(d => d.id === activeOrder.driverId) : null;

  const currentDistanceKm = routeDistanceKm ?? 10;
  const calcPrice = () => calcOrderPrice(currentDistanceKm, settings, tariff);

  const isDelivery = tariff === "delivery";
  const isCargo = tariff === "hourly";

  const handleMapPick = async (address: string) => {
    if (pickMode === "from") {
      setFrom(shortenAddress(address));
      const c = await geocodeAddress(address);
      if (c) setFromCoords(c);
    } else if (pickMode === "to") {
      if (isDelivery) setDeliveryAddress(address);
      else {
        setTo(shortenAddress(address));
        const c = await geocodeAddress(address);
        if (c) setToCoords(c);
      }
    }
    setPickMode(null);
  };

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
      fromLat: fromCoords?.lat ?? null,
      fromLng: fromCoords?.lng ?? null,
      toLat: toCoords?.lat ?? null,
      toLng: toCoords?.lng ?? null,
    };
    onOrderCreate(order);
    if (scheduledAtStr) {
      showToast(`Заказ на ${scheduledAtStr} оформлен`, "Водитель будет назначен ближе к времени");
      resetOrder();
    } else {
      setActiveOrderId(order.id);
      setStep("searching");
    }
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
    setRouteDistanceKm(null); setFromCoords(null); setToCoords(null);
    setScheduleType("now"); setScheduleDay(""); setScheduleMonth(""); setScheduleHour(""); setScheduleMin("");
    setPickMode(null);
  };

  const handleRate = (stars: number) => {
    if (activeOrder?.driverId && onRateDriver) onRateDriver(activeOrder.driverId, stars);
    resetOrder();
    showToast("Спасибо за оценку!", "Это помогает улучшать сервис");
  };

  const prevStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeOrderId) {
      const justAssigned = orders.find(
        (o) => o.passengerId === user.id && o.scheduledAt && o.status === "assigned"
      );
      if (justAssigned) {
        setActiveOrderId(justAssigned.id);
        setFrom(justAssigned.from || "");
        setTo(justAssigned.to || "");
        setTariff(justAssigned.tariff);
        setStep("found");
        playNotificationSound("arrive");
        sendPush("Taxi", "Водитель назначен на ваш предварительный заказ!");
      }
      return;
    }
    const order = orders.find((o) => o.id === activeOrderId);
    if (!order) return;
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = order.status;
    if (prevStatus === order.status) return;
    if (order.status === "assigned" && step === "searching") {
      setStep("found");
    } else if (order.status === "arrived" && (step === "searching" || step === "found")) {
      setStep("arrived");
    } else if (order.status === "inprogress" && step !== "inprogress") {
      setStep("inprogress");
    } else if (order.status === "done" && step !== "rating") {
      setStep("rating");
    } else if (order.status === "cancelled") {
      resetOrder();
    }
  }, [orders, activeOrderId, step, user.id]);

  const prevChatCountRef = useRef(0);
  const loadRideChat = useCallback(async () => {
    if (!activeOrderId) return;
    const res = await api.getRideChat(activeOrderId);
    if (res?.messages) {
      setChatMessages(res.messages.map((m: { from: string; text: string; senderName?: string }) => ({ from: m.from, text: m.text })));
      if (res.messages.length > prevChatCountRef.current) {
        const newMsgs = res.messages.slice(prevChatCountRef.current);
        const incoming = newMsgs.filter((m: { from: string }) => m.from === "driver");
        if (incoming.length > 0 && prevChatCountRef.current > 0) {
          playNotificationSound("message");
          if (!chatOpen) {
            setUnreadChat((prev) => prev + incoming.length);
            showToast("Сообщение от водителя", incoming[incoming.length - 1].text.slice(0, 60));
          }
          sendPush("Водитель", incoming[incoming.length - 1].text.slice(0, 80));
        }
      }
      prevChatCountRef.current = res.messages.length;
    }
  }, [activeOrderId, chatOpen]);

  useEffect(() => {
    if (!activeOrderId || step === "form" || step === "rating") return;
    loadRideChat();
    const interval = setInterval(loadRideChat, 3000);
    return () => clearInterval(interval);
  }, [activeOrderId, step, loadRideChat]);

  const openChat = () => {
    setChatOpen(true);
    setUnreadChat(0);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !activeOrderId) return;
    const text = chatInput.trim();
    setChatMessages(prev => [...prev, { from: "passenger", text }]);
    setChatInput("");
    await api.sendRideChat(activeOrderId, "passenger", user.id, user.name, text);
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

      {confirmAction && (
        <div style={{ position: "absolute", inset: 0, zIndex: 250, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--page-px)" }}>
          <div className="taxi-card animate-fade-slide-up" style={{ maxWidth: 320, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>
              {confirmAction.type === "cancel" ? "\u26A0\uFE0F" : "\uD83D\uDE96"}
            </div>
            <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 16, color: "#F0F2F5", marginBottom: 6 }}>
              {confirmAction.type === "cancel" ? "Отменить заказ?" : confirmAction.type === "order" ? "Подтвердить заказ?" : "Подтвердить?"}
            </div>
            <div style={{ fontSize: 13, color: "var(--taxi-muted)", marginBottom: 16, lineHeight: 1.5 }}>
              {confirmAction.type === "cancel" ? "Вы уверены, что хотите отменить заказ?" : confirmAction.type === "order" ? `Маршрут: ${routeLabel}${routeDistanceKm !== null ? ` (${routeDistanceKm} км)` : ""}\nСтоимость: ≈ ${calcPrice()} ₽` : "Подтвердите действие"}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setConfirmAction(null)}
                style={{ flex: 1, padding: "12px", background: "var(--taxi-surface)", border: "1px solid var(--taxi-border)", borderRadius: 12, color: "var(--taxi-muted)", fontSize: 14, cursor: "pointer", fontFamily: "Montserrat", fontWeight: 600 }}
              >
                Назад
              </button>
              <button
                onClick={() => { confirmAction.action(); setConfirmAction(null); }}
                style={{ flex: 1, padding: "12px", background: confirmAction.type === "cancel" ? "rgba(239,68,68,0.2)" : "var(--taxi-yellow)", border: confirmAction.type === "cancel" ? "1px solid rgba(239,68,68,0.4)" : "none", borderRadius: 12, color: confirmAction.type === "cancel" ? "var(--taxi-red)" : "var(--taxi-dark)", fontSize: 14, cursor: "pointer", fontFamily: "Montserrat", fontWeight: 700 }}
              >
                {confirmAction.type === "cancel" ? "Отменить" : "Да, заказать"}
              </button>
            </div>
          </div>
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
            Мы ценим, что вы выбрали наш сервис
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

      <div style={{ flex: step === "form" ? (pickMode ? "1 1 60%" : "0 0 200px") : 1, position: "relative", overflow: "hidden", transition: "flex 0.4s" }}>
        <YandexMap fromAddress={isDelivery ? "" : from} toAddress={isDelivery ? deliveryAddress : to} height="100%" pickMode={step === "form" ? pickMode : null} onMapPick={handleMapPick} />

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
            <button onClick={() => setConfirmAction({ type: "cancel", action: handleCancel })} style={{ background: "transparent", border: "1px solid var(--taxi-red)", borderRadius: 12, padding: "10px 24px", color: "var(--taxi-red)", fontSize: 13, cursor: "pointer", fontFamily: "Montserrat", fontWeight: 600 }}>
              Отменить
            </button>
          </div>
        )}

        {step === "found" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1 }} />
            <div className="animate-fade-slide-up" style={{ background: "var(--taxi-card)", borderRadius: "20px 20px 0 0", padding: "var(--page-px)", borderTop: "1px solid var(--taxi-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <span className="animate-blink" style={{ color: "var(--taxi-green)" }}>●</span>
                <span style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 15, color: "#F0F2F5" }}>Водитель найден</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px", background: "var(--taxi-surface)", borderRadius: 14, marginBottom: 12 }}>
                <div style={{ width: 50, height: 50, background: "var(--taxi-yellow)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>🚗</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 15, color: "#F0F2F5" }}>{assignedDriver?.name ?? "Водитель"}</div>
                  <div style={{ fontSize: 12, color: "var(--taxi-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{assignedDriver?.car ?? ""}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <span style={{ color: "var(--taxi-yellow)", fontSize: 12, fontWeight: 700 }}>★ {assignedDriver?.rating ?? "4.8"}</span>
                    <span style={{ fontSize: 11, color: "var(--taxi-muted)" }}>{assignedDriver?.tripsCount ?? 0} поездок</span>
                  </div>
                </div>
                <div style={{ textAlign: "center", flexShrink: 0 }}>
                  <div style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 22, color: "var(--taxi-yellow)" }}>{activeOrder?.etaMinutes ?? etaMinutes}</div>
                  <div style={{ fontSize: 10, color: "var(--taxi-muted)", marginTop: -2 }}>мин</div>
                </div>
              </div>

              <div style={{ padding: "10px 12px", background: "var(--taxi-surface)", borderRadius: 12, marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 3 }}>
                    <div style={{ width: 8, height: 8, background: "var(--taxi-green)", borderRadius: "50%" }} />
                    <div style={{ width: 1, height: 16, background: "var(--taxi-border)", margin: "2px 0" }} />
                    <div style={{ width: 8, height: 8, background: "var(--taxi-yellow)", borderRadius: 2 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "#F0F2F5", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeOrder?.from || from}</div>
                    <div style={{ fontSize: 13, color: "var(--taxi-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeOrder?.to || to}</div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--taxi-border)", paddingTop: 8, marginTop: 4 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", background: "var(--taxi-card)", borderRadius: 6, color: "var(--taxi-muted)" }}>{currentDistanceKm} км</span>
                    {activeOrder?.options.children && <span style={{ fontSize: 11, padding: "2px 8px", background: "var(--taxi-card)", borderRadius: 6, color: "var(--taxi-yellow)" }}>👶 {activeOrder.options.childrenCount}</span>}
                    {activeOrder?.options.luggage && <span style={{ fontSize: 11, padding: "2px 8px", background: "var(--taxi-card)", borderRadius: 6, color: "var(--taxi-yellow)" }}>🧳</span>}
                  </div>
                  <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 16, color: "var(--taxi-yellow)" }}>{calcPrice()} ₽</div>
                </div>
              </div>

              {activeOrder?.options.comment && (
                <div style={{ padding: "8px 12px", background: "var(--taxi-surface)", borderRadius: 10, fontSize: 12, color: "var(--taxi-muted)", marginBottom: 12, fontStyle: "italic" }}>
                  {activeOrder.options.comment}
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                {assignedDriver?.phone && (
                  <a href={`tel:${assignedDriver.phone.replace(/\s/g, "")}`} style={{ width: 48, height: 48, flexShrink: 0, background: "var(--taxi-green)", border: "none", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
                    <Icon name="Phone" size={20} color="#fff" />
                  </a>
                )}
                <button onClick={() => openChat()} style={{ flex: 1, padding: "13px", background: "var(--taxi-surface)", border: "1px solid var(--taxi-border)", borderRadius: 12, color: "#F0F2F5", fontSize: 13, cursor: "pointer", fontFamily: "Montserrat", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, position: "relative" }}>
                  <Icon name="MessageCircle" size={16} color="var(--taxi-yellow)" /> Чат
                  {unreadChat > 0 && <span style={{ position: "absolute", top: -6, right: -6, minWidth: 18, height: 18, background: "var(--taxi-red)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700, padding: "0 4px" }}>{unreadChat}</span>}
                </button>
                <button onClick={() => setConfirmAction({ type: "cancel", action: handleCancel })} style={{ flex: 1, padding: "13px", background: "transparent", border: "1px solid var(--taxi-red)", borderRadius: 12, color: "var(--taxi-red)", fontSize: 13, cursor: "pointer", fontFamily: "Montserrat", fontWeight: 600 }}>
                  Отменить
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "arrived" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1 }} />
            <div className="animate-fade-slide-up" style={{ background: "var(--taxi-card)", borderRadius: "20px 20px 0 0", padding: "var(--page-px)", borderTop: "2px solid var(--taxi-green)" }}>
              <div style={{ textAlign: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 36, marginBottom: 6 }}>🚕</div>
                <div style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 16, color: "var(--taxi-green)" }}>Вас ожидает</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px", background: "var(--taxi-surface)", borderRadius: 14, marginBottom: 12 }}>
                <div style={{ width: 50, height: 50, background: "var(--taxi-yellow)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>🚗</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 15, color: "#F0F2F5" }}>{assignedDriver?.name ?? "Водитель"}</div>
                  <div style={{ fontSize: 12, color: "var(--taxi-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{assignedDriver?.car ?? ""}</div>
                </div>
                <div style={{ color: "var(--taxi-yellow)", fontSize: 14, fontWeight: 700 }}>★ {assignedDriver?.rating ?? "4.8"}</div>
              </div>

              <div style={{ padding: "10px 12px", background: "var(--taxi-surface)", borderRadius: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "var(--taxi-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Заказ</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 3 }}>
                    <div style={{ width: 8, height: 8, background: "var(--taxi-green)", borderRadius: "50%" }} />
                    <div style={{ width: 1, height: 16, background: "var(--taxi-border)", margin: "2px 0" }} />
                    <div style={{ width: 8, height: 8, background: "var(--taxi-yellow)", borderRadius: 2 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "#F0F2F5", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeOrder?.from || from}</div>
                    <div style={{ fontSize: 13, color: "var(--taxi-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeOrder?.to || to}</div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--taxi-border)", paddingTop: 8 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", background: "var(--taxi-card)", borderRadius: 6, color: "var(--taxi-muted)" }}>{currentDistanceKm} км</span>
                    {activeOrder?.options.children && <span style={{ fontSize: 11, padding: "2px 8px", background: "var(--taxi-card)", borderRadius: 6, color: "var(--taxi-yellow)" }}>👶 {activeOrder.options.childrenCount}</span>}
                    {activeOrder?.options.luggage && <span style={{ fontSize: 11, padding: "2px 8px", background: "var(--taxi-card)", borderRadius: 6, color: "var(--taxi-yellow)" }}>🧳</span>}
                  </div>
                  <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 16, color: "var(--taxi-yellow)" }}>{calcPrice()} ₽</div>
                </div>
                {activeOrder?.options.comment && (
                  <div style={{ marginTop: 8, padding: "6px 10px", background: "var(--taxi-card)", borderRadius: 8, fontSize: 12, color: "var(--taxi-muted)", fontStyle: "italic" }}>
                    {activeOrder.options.comment}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {assignedDriver?.phone && (
                  <a href={`tel:${assignedDriver.phone.replace(/\s/g, "")}`} style={{ width: 48, height: 48, flexShrink: 0, background: "var(--taxi-green)", border: "none", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
                    <Icon name="Phone" size={20} color="#fff" />
                  </a>
                )}
                <button onClick={() => openChat()} style={{ flex: 1, padding: "13px", background: "var(--taxi-surface)", border: "1px solid var(--taxi-border)", borderRadius: 12, color: "#F0F2F5", fontSize: 13, cursor: "pointer", fontFamily: "Montserrat", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, position: "relative" }}>
                  <Icon name="MessageCircle" size={16} color="var(--taxi-yellow)" /> Написать водителю
                  {unreadChat > 0 && <span style={{ position: "absolute", top: -6, right: -6, minWidth: 18, height: 18, background: "var(--taxi-red)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700, padding: "0 4px" }}>{unreadChat}</span>}
                </button>
              </div>
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
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                {assignedDriver?.phone && (
                  <a href={`tel:${assignedDriver.phone.replace(/\s/g, "")}`} style={{ width: 44, height: 44, flexShrink: 0, background: "var(--taxi-green)", border: "none", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
                    <Icon name="Phone" size={18} color="#fff" />
                  </a>
                )}
                <button onClick={() => openChat()} style={{ flex: 1, padding: "11px", background: "var(--taxi-surface)", border: "1px solid var(--taxi-border)", borderRadius: 12, color: "#F0F2F5", fontSize: 12, cursor: "pointer", fontFamily: "Montserrat", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, position: "relative" }}>
                  <Icon name="MessageCircle" size={15} color="var(--taxi-yellow)" /> Чат
                  {unreadChat > 0 && <span style={{ position: "absolute", top: -6, right: -6, minWidth: 18, height: 18, background: "var(--taxi-red)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700, padding: "0 4px" }}>{unreadChat}</span>}
                </button>
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
          {orders.filter((o) => o.passengerId === user.id && o.status === "pending" && o.scheduledAt).length > 0 && (
            <div style={{ background: "rgba(255,204,0,0.08)", border: "1px solid rgba(255,204,0,0.2)", borderRadius: 12, padding: "8px 12px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>📅</span>
              <div style={{ flex: 1 }}>
                {orders.filter((o) => o.passengerId === user.id && o.status === "pending" && o.scheduledAt).map((o) => (
                  <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--taxi-yellow)", padding: "2px 0" }}>
                    <span>{o.from} → {o.to} на {o.scheduledAt}</span>
                    <button onClick={() => onOrderCancel(o.id)} style={{ background: "none", border: "none", color: "var(--taxi-red)", fontSize: 11, cursor: "pointer", padding: "2px 6px" }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <AddressInput value={deliveryAddress} onChange={setDeliveryAddress} placeholder="Куда доставить?" dotColor="var(--taxi-yellow)" />
                </div>
                <button onClick={() => setPickMode(pickMode === "to" ? null : "to")}
                  style={{ width: 44, height: 44, flexShrink: 0, background: pickMode === "to" ? "var(--taxi-yellow)" : "var(--taxi-surface)", border: `1px solid ${pickMode === "to" ? "var(--taxi-yellow)" : "var(--taxi-border)"}`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Icon name="MapPin" size={18} color={pickMode === "to" ? "var(--taxi-dark)" : "var(--taxi-yellow)"} />
                </button>
              </div>
              <div style={{ height: 8 }} />
              <textarea className="taxi-input" placeholder="Что нужно доставить?" value={deliveryWhat} onChange={(e) => setDeliveryWhat(e.target.value)} rows={2} style={{ resize: "none", marginBottom: 10 }} />
            </>
          ) : (
            <>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 14, gap: 2 }}>
                  <div style={{ width: 10, height: 10, background: "var(--taxi-green)", borderRadius: "50%" }} />
                  <div style={{ width: 1, flex: 1, background: "var(--taxi-border)", minHeight: 14 }} />
                  <div style={{ width: 10, height: 10, background: "var(--taxi-yellow)", borderRadius: 2 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <AddressInput value={from} onChange={setFrom} placeholder="Откуда едем?" dotColor="var(--taxi-green)" />
                    </div>
                    <button onClick={() => setPickMode(pickMode === "from" ? null : "from")}
                      style={{ width: 44, height: 44, flexShrink: 0, background: pickMode === "from" ? "var(--taxi-green)" : "var(--taxi-surface)", border: `1px solid ${pickMode === "from" ? "var(--taxi-green)" : "var(--taxi-border)"}`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <Icon name="MapPin" size={18} color={pickMode === "from" ? "#fff" : "var(--taxi-green)"} />
                    </button>
                  </div>
                  <div style={{ height: 6 }} />
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <AddressInput value={to} onChange={setTo} placeholder="Куда едем?" dotColor="var(--taxi-yellow)" />
                    </div>
                    <button onClick={() => setPickMode(pickMode === "to" ? null : "to")}
                      style={{ width: 44, height: 44, flexShrink: 0, background: pickMode === "to" ? "var(--taxi-yellow)" : "var(--taxi-surface)", border: `1px solid ${pickMode === "to" ? "var(--taxi-yellow)" : "var(--taxi-border)"}`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <Icon name="MapPin" size={18} color={pickMode === "to" ? "var(--taxi-dark)" : "var(--taxi-yellow)"} />
                    </button>
                  </div>
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

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, padding: "8px 0", borderTop: "1px solid var(--taxi-border)" }}>
            <div style={{ fontSize: 13, color: "var(--taxi-muted)" }}>Предварительная стоимость:</div>
            <div style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 20, color: "var(--taxi-yellow)" }}>
              {routeLoading ? "..." : `≈ ${calcPrice()} ₽`}
            </div>
          </div>
          {routeDistanceKm !== null && !isDelivery && !isCargo && (
            <div style={{ fontSize: 11, color: "var(--taxi-muted)", marginBottom: 10, textAlign: "right" }}>
              {routeDistanceKm} км по маршруту
            </div>
          )}

          <button className="btn-yellow" onClick={() => setConfirmAction({ type: "order", action: handleOrder })} disabled={!canOrder} style={{ opacity: canOrder ? 1 : 0.5 }}>
            {isDelivery ? "Заказать доставку" : isCargo ? "Заказать грузовое" : "Заказать такси"}
          </button>
        </div>
      )}
    </div>
  );
}