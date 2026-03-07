import { useState, useMemo } from "react";
import Icon from "@/components/ui/icon";
import {
  Driver,
  Order,
  AppSettings,
  User,
  SupportMessage,
  AutoAssignMode,
  calcOrderPrice,
  isSubscriptionActive,
  subscriptionDaysLeft,
} from "./types";
import { playNotificationSound, sendPush } from "./notifications";

interface Props {
  drivers: Driver[];
  orders: Order[];
  settings: AppSettings;
  passengers: User[];
  supportMessages: SupportMessage[];
  onUpdateSettings: (s: AppSettings) => void;
  onUpdateDriver: (id: string, changes: Partial<Driver>) => void;
  onAddDriver: (d: Driver) => void;
  onDeleteDriver: (id: string) => void;
  onDeleteUser: (id: string) => void;
  onLogout: () => void;
  onCancelOrder: (id: string, by?: "passenger" | "driver" | "admin") => void;
  onUpdateOrder: (id: string, changes: Partial<Order>) => void;
  onSendSupport: (msg: SupportMessage) => void;
  onAcceptOrder: (orderId: string, driverId: string, driverName: string, eta?: number) => void;
}

type AdminTab = "overview" | "stats" | "drivers" | "tariffs" | "chat";

const NAV_ITEMS: { id: AdminTab; label: string; icon: string }[] = [
  { id: "overview", label: "Обзор", icon: "LayoutDashboard" },
  { id: "stats", label: "Статистика", icon: "BarChart3" },
  { id: "drivers", label: "Водители", icon: "Car" },
  { id: "tariffs", label: "Тарифы", icon: "Settings" },
  { id: "chat", label: "Чат", icon: "MessageSquare" },
];

const STATUS_LABELS: Record<string, string> = {
  pending: "Свободный",
  assigned: "Назначен",
  waiting: "Ожидание",
  arrived: "На месте",
  inprogress: "В пути",
  done: "Завершён",
  cancelled: "Отменён",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--taxi-muted)",
  textTransform: "uppercase",
  letterSpacing: 0.8,
  marginBottom: 10,
  fontFamily: "Montserrat",
  fontWeight: 700,
};

const headingStyle: React.CSSProperties = {
  fontFamily: "Montserrat",
  fontWeight: 800,
  color: "#F0F2F5",
};

const mutedText: React.CSSProperties = {
  fontSize: 12,
  color: "var(--taxi-muted)",
  fontFamily: "Golos Text",
};

const labelRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 6,
};

const sliderStyle: React.CSSProperties = {
  width: "100%",
  accentColor: "var(--taxi-yellow)",
  cursor: "pointer",
};

const badgeBase: React.CSSProperties = {
  fontSize: 10,
  padding: "2px 8px",
  borderRadius: 6,
  fontWeight: 600,
  fontFamily: "Golos Text",
};

function statusColor(status: string) {
  if (status === "pending") return { bg: "rgba(255,204,0,0.15)", color: "var(--taxi-yellow)" };
  if (status === "assigned" || status === "waiting") return { bg: "rgba(96,165,250,0.15)", color: "#60A5FA" };
  if (status === "arrived" || status === "inprogress") return { bg: "rgba(34,197,94,0.15)", color: "var(--taxi-green)" };
  if (status === "cancelled") return { bg: "rgba(239,68,68,0.15)", color: "var(--taxi-red)" };
  return { bg: "var(--taxi-surface)", color: "var(--taxi-muted)" };
}

export default function AdminScreen({
  drivers,
  orders,
  settings,
  passengers,
  supportMessages,
  onUpdateSettings,
  onUpdateDriver,
  onAddDriver,
  onDeleteDriver,
  onDeleteUser,
  onLogout,
  onCancelOrder,
  onUpdateOrder,
  onSendSupport,
  onAcceptOrder,
}: Props) {
  const [tab, setTab] = useState<AdminTab>("overview");

  const [pwModal, setPwModal] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  const [orderModal, setOrderModal] = useState<Order | null>(null);
  const [discountSlider, setDiscountSlider] = useState(0);

  const [localSettings, setLocalSettings] = useState<AppSettings>({ ...settings });
  const [tariffSaved, setTariffSaved] = useState(false);
  const [editCoeffIdx, setEditCoeffIdx] = useState<number | null>(null);
  const [coeffFrom, setCoeffFrom] = useState(0);
  const [coeffTo, setCoeffTo] = useState(0);
  const [coeffVal, setCoeffVal] = useState(1);
  const [addingCoeff, setAddingCoeff] = useState(false);
  const [previewKm, setPreviewKm] = useState(10);

  const [addDriverOpen, setAddDriverOpen] = useState(false);
  const [newLogin, setNewLogin] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const [confirmDeleteDriver, setConfirmDeleteDriver] = useState<string | null>(null);
  const [subDaysInput, setSubDaysInput] = useState<Record<string, number>>({});

  const [chatUser, setChatUser] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");

  const [changePwUserId, setChangePwUserId] = useState<string | null>(null);
  const [userNewPw, setUserNewPw] = useState("");

  const freeOrders = orders.filter((o) => o.status === "pending");
  const inWorkOrders = orders.filter((o) => o.status === "assigned" || o.status === "waiting" || o.status === "arrived" || o.status === "inprogress");
  const activeOrders = [...freeOrders, ...inWorkOrders];
  const onlineDrivers = drivers.filter((d) => d.status === "active" || d.status === "busy");

  const chatGroups = useMemo(() => {
    const groups: Record<string, { name: string; role: string; messages: SupportMessage[] }> = {};
    for (const msg of supportMessages) {
      if (msg.fromRole === "admin") {
        const target = supportMessages.find(
          (m) => m.fromRole !== "admin" && m.fromId === msg.fromId
        );
        if (target) {
          if (!groups[target.fromId]) groups[target.fromId] = { name: target.fromName, role: target.fromRole, messages: [] };
          groups[target.fromId].messages.push(msg);
        }
        continue;
      }
      if (!groups[msg.fromId]) groups[msg.fromId] = { name: msg.fromName, role: msg.fromRole, messages: [] };
      groups[msg.fromId].messages.push(msg);
    }
    for (const msg of supportMessages) {
      if (msg.fromRole === "admin" && !Object.values(groups).some((g) => g.messages.includes(msg))) {
        const recipientId = msg.fromId;
        if (groups[recipientId]) {
          if (!groups[recipientId].messages.includes(msg)) groups[recipientId].messages.push(msg);
        }
      }
    }
    Object.values(groups).forEach((g) => g.messages.sort((a, b) => a.timestamp - b.timestamp));
    return groups;
  }, [supportMessages]);

  const handleChangePassword = () => {
    if (oldPw !== settings.adminPassword) {
      setPwError("Неверный текущий пароль");
      return;
    }
    if (newPw.length < 4) {
      setPwError("Минимум 4 символа");
      return;
    }
    onUpdateSettings({ ...settings, adminPassword: newPw });
    setPwSuccess(true);
    setPwError("");
    setTimeout(() => {
      setPwModal(false);
      setPwSuccess(false);
      setOldPw("");
      setNewPw("");
    }, 1500);
  };

  const handleOpenOrderModal = (order: Order) => {
    setDiscountSlider(order.discount || 0);
    setOrderModal(order);
  };

  const handleAutoAssign = (order: Order) => {
    const available = drivers.filter(
      (d) => d.status === "active" && isSubscriptionActive(d) && d.autoAssign
    );
    if (available.length === 0) return;
    let chosen: Driver;
    if (settings.autoAssignMode === "rating") {
      chosen = available.sort((a, b) => b.rating - a.rating)[0];
    } else if (settings.autoAssignMode === "trips") {
      chosen = available.sort((a, b) => b.tripsCount - a.tripsCount)[0];
    } else {
      chosen = available.sort((a, b) => (b.hasAds ? 1 : 0) - (a.hasAds ? 1 : 0) || b.rating - a.rating)[0];
    }
    onAcceptOrder(order.id, chosen.id, chosen.name, 5);
    playNotificationSound("order");
    sendPush("Авто-назначение", `Заказ ${order.from} → ${order.to} назначен на ${chosen.name}`);
    setOrderModal(null);
  };

  const handleApplyDiscount = (order: Order) => {
    onUpdateOrder(order.id, { discount: discountSlider });
    setOrderModal(null);
  };

  const handleSaveTariffs = () => {
    onUpdateSettings(localSettings);
    setTariffSaved(true);
    setTimeout(() => setTariffSaved(false), 2000);
  };

  const handleAddDriver = () => {
    if (!newLogin.trim() || !newPassword.trim() || !newName.trim() || !newPhone.trim()) return;
    const driver: Driver = {
      id: `d_${Date.now()}`,
      name: newName.trim(),
      phone: newPhone.trim(),
      car: "",
      carInfo: { brand: "", model: "", plateNumber: "" },
      rating: 5.0,
      status: "active",
      autoAssign: false,
      distanceKm: 0,
      tripsCount: 0,
      tripsLast24h: 0,
      priority: 1,
      login: newLogin.trim(),
      password: newPassword.trim(),
      hasAds: false,
      subscriptionDays: 0,
      freeWork: false,
      registeredAt: new Date().toISOString().slice(0, 10),
      autoAssignDeclines: 0,
      cancelledOrders: 0,
      autoAssignTrips: 0,
      freeTrips: 0,
      totalEarnings: 0,
      totalKm: 0,
      totalHours: 0,
    };
    onAddDriver(driver);
    setAddDriverOpen(false);
    setNewLogin("");
    setNewPassword("");
    setNewName("");
    setNewPhone("");
    playNotificationSound("message");
  };

  const handleSendChat = () => {
    if (!chatInput.trim() || !chatUser) return;
    const msg: SupportMessage = {
      id: `sm_${Date.now()}`,
      fromId: chatUser,
      fromName: "Администратор",
      fromRole: "admin",
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
      timestamp: Date.now(),
      read: false,
    };
    onSendSupport(msg);
    setChatInput("");
    playNotificationSound("message");
  };

  const handleSetSubscription = (driverId: string, days: number) => {
    onUpdateDriver(driverId, { subscriptionDays: days, subscriptionStart: Date.now() });
  };

  const handleChangeUserPassword = (userId: string) => {
    if (!userNewPw.trim() || userNewPw.length < 4) return;
    const driver = drivers.find((d) => d.id === userId);
    if (driver) {
      onUpdateDriver(userId, { password: userNewPw.trim() });
    }
    setChangePwUserId(null);
    setUserNewPw("");
  };

  const renderOverview = () => (
    <div className="animate-fade-slide-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 style={{ ...headingStyle, fontSize: 22, marginBottom: 2 }}>Администратор</h1>
          <div style={{ fontSize: 12, color: "var(--taxi-muted)" }}>Панель управления</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setPwModal(true)}
            style={{
              padding: "8px 12px",
              background: "var(--taxi-surface)",
              border: "1px solid var(--taxi-border)",
              borderRadius: 12,
              color: "#F0F2F5",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "Golos Text",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Icon name="Lock" size={14} />
            Пароль
          </button>
          <button
            onClick={onLogout}
            style={{
              padding: "8px 12px",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 12,
              color: "var(--taxi-red)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "Golos Text",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Icon name="LogOut" size={14} />
            Выйти
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
        {[
          { label: "Свободные", value: freeOrders.length, color: "var(--taxi-yellow)", icon: "Clock" },
          { label: "В работе", value: inWorkOrders.length, color: "#60A5FA", icon: "Loader" },
          { label: "Онлайн", value: onlineDrivers.length, color: "var(--taxi-green)", icon: "Users" },
        ].map((s) => (
          <div key={s.label} className="taxi-card" style={{ textAlign: "center", padding: "12px 6px" }}>
            <Icon name={s.icon} size={20} color={s.color} />
            <div style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 22, color: s.color, margin: "4px 0 2px" }}>
              {s.value}
            </div>
            <div style={{ fontSize: 10, color: "var(--taxi-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={sectionTitle}>Активные заказы ({activeOrders.length})</div>
      {activeOrders.length === 0 ? (
        <div className="taxi-card" style={{ textAlign: "center", padding: "var(--page-px)", color: "var(--taxi-muted)", fontSize: 13 }}>
          Нет активных заказов
        </div>
      ) : (
        activeOrders.map((order, idx) => {
          const sc = statusColor(order.status);
          const canCancel = order.status === "pending" || order.status === "assigned";
          return (
            <div
              key={order.id}
              className="taxi-card animate-fade-slide-up"
              style={{ marginBottom: 8, animationDelay: `${idx * 0.05}s`, cursor: order.status === "pending" ? "pointer" : "default" }}
              onClick={() => order.status === "pending" && handleOpenOrderModal(order)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "#F0F2F5", marginBottom: 3, fontWeight: 600 }}>
                    {order.from} → {order.to}
                  </div>
                  <div style={{ ...mutedText, fontSize: 11 }}>
                    {order.passengerName} · {order.createdAt} · {order.distanceKm} км
                  </div>
                  {order.driverName && (
                    <div style={{ fontSize: 11, color: "var(--taxi-green)", marginTop: 2 }}>
                      <Icon name="Car" size={11} /> {order.driverName}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0, marginLeft: 8 }}>
                  <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 15, color: "var(--taxi-yellow)" }}>
                    {order.price} ₽
                  </div>
                  <div style={{ ...badgeBase, background: sc.bg, color: sc.color }}>
                    {STATUS_LABELS[order.status]}
                  </div>
                </div>
              </div>
              {canCancel && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancelOrder(order.id, "admin");
                  }}
                  style={{
                    marginTop: 8,
                    padding: "6px 12px",
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: 10,
                    color: "var(--taxi-red)",
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "Golos Text",
                    fontWeight: 600,
                  }}
                >
                  <Icon name="X" size={11} /> Отменить
                </button>
              )}
            </div>
          );
        })
      )}

      <div style={{ ...sectionTitle, marginTop: 16 }}>Водители онлайн ({onlineDrivers.length})</div>
      {onlineDrivers.length === 0 ? (
        <div className="taxi-card" style={{ textAlign: "center", padding: "var(--page-px)", color: "var(--taxi-muted)", fontSize: 13 }}>
          Нет водителей онлайн
        </div>
      ) : (
        onlineDrivers.map((d, idx) => (
          <div key={d.id} className="taxi-card animate-fade-slide-up" style={{ marginBottom: 8, animationDelay: `${idx * 0.05}s` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  background: "var(--taxi-surface)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name="User" size={18} color="var(--taxi-muted)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#F0F2F5", fontWeight: 600 }}>{d.name}</div>
                <div style={{ fontSize: 11, color: "var(--taxi-muted)" }}>{d.car || "Авто не указано"}</div>
              </div>
              <div
                style={{
                  ...badgeBase,
                  background: d.status === "active" ? "rgba(34,197,94,0.15)" : "rgba(96,165,250,0.15)",
                  color: d.status === "active" ? "var(--taxi-green)" : "#60A5FA",
                }}
              >
                {d.status === "active" ? "Свободен" : "Занят"}
              </div>
            </div>
          </div>
        ))
      )}

      {pwModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            padding: 24,
          }}
          onClick={() => setPwModal(false)}
        >
          <div
            className="taxi-card animate-fade-slide-up"
            style={{ width: "calc(100% - 24px)", maxWidth: 340 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ ...headingStyle, fontSize: 16, marginBottom: 16 }}>Смена пароля</div>
            <input
              className="taxi-input"
              type="password"
              placeholder="Текущий пароль"
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
              style={{ marginBottom: 10 }}
            />
            <input
              className="taxi-input"
              type="password"
              placeholder="Новый пароль"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              style={{ marginBottom: 10 }}
            />
            {pwError && <div style={{ fontSize: 12, color: "var(--taxi-red)", marginBottom: 8 }}>{pwError}</div>}
            {pwSuccess && <div style={{ fontSize: 12, color: "var(--taxi-green)", marginBottom: 8 }}>Пароль изменён</div>}
            <button className="btn-yellow" onClick={handleChangePassword} style={{ padding: 12, fontSize: 14 }}>
              Сохранить
            </button>
          </div>
        </div>
      )}

      {orderModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            padding: 24,
          }}
          onClick={() => setOrderModal(null)}
        >
          <div
            className="taxi-card animate-fade-slide-up"
            style={{ width: "calc(100% - 24px)", maxWidth: 380 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ ...headingStyle, fontSize: 16, marginBottom: 4 }}>Заказ #{orderModal.id}</div>
            <div style={{ ...mutedText, marginBottom: 12 }}>{orderModal.createdAt}</div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 3 }}>
                  <div style={{ width: 8, height: 8, background: "var(--taxi-green)", borderRadius: "50%" }} />
                  <div style={{ width: 1, flex: 1, background: "var(--taxi-border)", margin: "3px 0" }} />
                  <div style={{ width: 8, height: 8, background: "var(--taxi-yellow)", borderRadius: 2 }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "#F0F2F5", marginBottom: 4 }}>{orderModal.from}</div>
                  <div style={{ fontSize: 13, color: "var(--taxi-muted)" }}>{orderModal.to}</div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-muted)" }}>
                {orderModal.passengerName}
              </span>
              <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-muted)" }}>
                {orderModal.distanceKm} км
              </span>
              <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-muted)" }}>
                {orderModal.paymentMethod === "cash" ? "Наличные" : "Перевод"}
              </span>
              <span style={{ fontSize: 11, padding: "3px 8px", background: "rgba(255,204,0,0.15)", borderRadius: 6, color: "var(--taxi-yellow)", fontWeight: 700 }}>
                {orderModal.price} ₽
              </span>
            </div>

            {orderModal.options.comment && (
              <div style={{ padding: "8px 10px", background: "var(--taxi-surface)", borderRadius: 10, fontSize: 12, color: "var(--taxi-muted)", marginBottom: 12, fontStyle: "italic" }}>
                {orderModal.options.comment}
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <div style={labelRow}>
                <span style={{ fontSize: 13, color: "var(--taxi-muted)" }}>Скидка</span>
                <span style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, color: "var(--taxi-yellow)" }}>
                  {discountSlider}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={15}
                step={1}
                value={discountSlider}
                onChange={(e) => setDiscountSlider(Number(e.target.value))}
                style={sliderStyle}
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => handleApplyDiscount(orderModal)}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "var(--taxi-surface)",
                  border: "1px solid var(--taxi-border)",
                  borderRadius: 12,
                  color: "#F0F2F5",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "Golos Text",
                  fontWeight: 600,
                }}
              >
                Применить скидку
              </button>
              <button
                onClick={() => handleAutoAssign(orderModal)}
                className="btn-yellow"
                style={{ flex: 1, padding: "10px", fontSize: 12, borderRadius: 12 }}
              >
                Авто-назначение
              </button>
            </div>
            <button
              onClick={() => {
                onCancelOrder(orderModal.id, "admin");
                setOrderModal(null);
              }}
              style={{
                width: "100%",
                marginTop: 8,
                padding: "10px",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 12,
                color: "var(--taxi-red)",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "Golos Text",
                fontWeight: 600,
              }}
            >
              Отменить заказ
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderStats = () => {
    const totalOrders = orders.length;
    const completedOrders = orders.filter((o) => o.status === "done").length;
    const cancelledOrders = orders.filter((o) => o.status === "cancelled").length;
    const totalRevenue = orders.filter((o) => o.status === "done").reduce((s, o) => s + (o.price || 0), 0);

    const passengerStats = passengers.map((p) => {
      const pOrders = orders.filter((o) => o.passengerId === p.id);
      return {
        id: p.id,
        name: p.name,
        totalOrders: pOrders.length,
        completed: pOrders.filter((o) => o.status === "done").length,
        cancelled: pOrders.filter((o) => o.status === "cancelled").length,
      };
    });

    const allUsers = [
      ...passengers.map((p) => ({ id: p.id, name: p.name, role: "passenger" as const, registeredAt: p.registeredAt || "-" })),
      ...drivers.map((d) => ({ id: d.id, name: d.name, role: "driver" as const, registeredAt: d.registeredAt || "-" })),
    ];

    return (
      <div className="animate-fade-slide-up">
        <div style={{ ...headingStyle, fontSize: 18, marginBottom: 16 }}>Статистика</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          {[
            { label: "Всего заказов", value: totalOrders, color: "var(--taxi-yellow)" },
            { label: "Завершено", value: completedOrders, color: "var(--taxi-green)" },
            { label: "Отменено", value: cancelledOrders, color: "var(--taxi-red)" },
            { label: "Выручка", value: `${totalRevenue} ₽`, color: "var(--taxi-yellow)" },
          ].map((s) => (
            <div key={s.label} className="taxi-card" style={{ textAlign: "center", padding: "12px 8px" }}>
              <div style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 20, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "var(--taxi-muted)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={sectionTitle}>Пассажиры (30 дн.)</div>
        <div className="taxi-card" style={{ marginBottom: 16, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "Golos Text" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--taxi-border)" }}>
                <th style={{ textAlign: "left", padding: "8px 6px", color: "var(--taxi-muted)", fontWeight: 600 }}>Имя</th>
                <th style={{ textAlign: "center", padding: "8px 4px", color: "var(--taxi-muted)", fontWeight: 600 }}>Всего</th>
                <th style={{ textAlign: "center", padding: "8px 4px", color: "var(--taxi-muted)", fontWeight: 600 }}>Завер.</th>
                <th style={{ textAlign: "center", padding: "8px 4px", color: "var(--taxi-muted)", fontWeight: 600 }}>Отмен.</th>
              </tr>
            </thead>
            <tbody>
              {passengerStats.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--taxi-border)" }}>
                  <td style={{ padding: "8px 6px", color: "#F0F2F5" }}>{p.name}</td>
                  <td style={{ textAlign: "center", padding: "8px 4px", color: "var(--taxi-yellow)", fontWeight: 600 }}>{p.totalOrders}</td>
                  <td style={{ textAlign: "center", padding: "8px 4px", color: "var(--taxi-green)" }}>{p.completed}</td>
                  <td style={{ textAlign: "center", padding: "8px 4px", color: "var(--taxi-red)" }}>{p.cancelled}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={sectionTitle}>Водители (30 дн.)</div>
        <div className="taxi-card" style={{ marginBottom: 16, overflowX: "auto" }}>
          <div style={{ minWidth: 500 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "Golos Text" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--taxi-border)" }}>
                  <th style={{ textAlign: "left", padding: "8px 4px", color: "var(--taxi-muted)", fontWeight: 600 }}>Имя</th>
                  <th style={{ textAlign: "center", padding: "8px 3px", color: "var(--taxi-muted)", fontWeight: 600 }}>Рейт.</th>
                  <th style={{ textAlign: "center", padding: "8px 3px", color: "var(--taxi-muted)", fontWeight: 600 }}>Поезд.</th>
                  <th style={{ textAlign: "center", padding: "8px 3px", color: "var(--taxi-muted)", fontWeight: 600 }}>Авто</th>
                  <th style={{ textAlign: "center", padding: "8px 3px", color: "var(--taxi-muted)", fontWeight: 600 }}>Своб.</th>
                  <th style={{ textAlign: "center", padding: "8px 3px", color: "var(--taxi-muted)", fontWeight: 600 }}>Откл.</th>
                  <th style={{ textAlign: "center", padding: "8px 3px", color: "var(--taxi-muted)", fontWeight: 600 }}>Отмен.</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => (
                  <tr key={d.id} style={{ borderBottom: "1px solid var(--taxi-border)" }}>
                    <td style={{ padding: "8px 4px", color: "#F0F2F5", whiteSpace: "nowrap" }}>{d.name}</td>
                    <td style={{ textAlign: "center", padding: "8px 3px", color: "var(--taxi-yellow)", fontWeight: 600 }}>{d.rating}</td>
                    <td style={{ textAlign: "center", padding: "8px 3px", color: "#F0F2F5" }}>{d.tripsCount}</td>
                    <td style={{ textAlign: "center", padding: "8px 3px", color: "#60A5FA" }}>{d.autoAssignTrips}</td>
                    <td style={{ textAlign: "center", padding: "8px 3px", color: "var(--taxi-green)" }}>{d.freeTrips}</td>
                    <td style={{ textAlign: "center", padding: "8px 3px", color: "var(--taxi-muted)" }}>{d.autoAssignDeclines}</td>
                    <td style={{ textAlign: "center", padding: "8px 3px", color: "var(--taxi-red)" }}>{d.cancelledOrders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={sectionTitle}>Все пользователи</div>
        <div className="taxi-card" style={{ marginBottom: 16 }}>
          {allUsers.map((u, i) => (
            <div
              key={u.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                borderBottom: i < allUsers.length - 1 ? "1px solid var(--taxi-border)" : "none",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#F0F2F5", fontWeight: 600 }}>{u.name}</div>
                <div style={{ fontSize: 11, color: "var(--taxi-muted)" }}>
                  {u.role === "driver" ? "Водитель" : "Пассажир"} · {u.registeredAt}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {u.role === "driver" && (
                  <button
                    onClick={() => {
                      setChangePwUserId(u.id);
                      setUserNewPw("");
                    }}
                    style={{
                      padding: "4px 8px",
                      background: "var(--taxi-surface)",
                      border: "1px solid var(--taxi-border)",
                      borderRadius: 8,
                      color: "var(--taxi-yellow)",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    <Icon name="Key" size={11} />
                  </button>
                )}
                <button
                  onClick={() => onDeleteUser(u.id)}
                  style={{
                    padding: "4px 8px",
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 8,
                    color: "var(--taxi-red)",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  <Icon name="Trash2" size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {changePwUserId && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 200,
              padding: 24,
            }}
            onClick={() => setChangePwUserId(null)}
          >
            <div
              className="taxi-card animate-fade-slide-up"
              style={{ width: "calc(100% - 24px)", maxWidth: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ ...headingStyle, fontSize: 15, marginBottom: 12 }}>Новый пароль</div>
              <input
                className="taxi-input"
                type="text"
                placeholder="Введите новый пароль"
                value={userNewPw}
                onChange={(e) => setUserNewPw(e.target.value)}
                style={{ marginBottom: 10 }}
              />
              <button
                className="btn-yellow"
                onClick={() => handleChangeUserPassword(changePwUserId)}
                style={{ padding: 10, fontSize: 13 }}
              >
                Сохранить
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDrivers = () => (
    <div className="animate-fade-slide-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ ...headingStyle, fontSize: 18 }}>Водители ({drivers.length})</div>
        <button
          onClick={() => setAddDriverOpen(!addDriverOpen)}
          style={{
            padding: "8px 14px",
            background: "var(--taxi-yellow)",
            border: "none",
            borderRadius: 12,
            color: "var(--taxi-dark)",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "Montserrat",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <Icon name="UserPlus" size={14} />
          Добавить
        </button>
      </div>

      {addDriverOpen && (
        <div className="taxi-card animate-fade-slide-up" style={{ marginBottom: 14 }}>
          <div style={{ ...headingStyle, fontSize: 14, marginBottom: 12 }}>Новый водитель</div>
          <input
            className="taxi-input"
            placeholder="Логин"
            value={newLogin}
            onChange={(e) => setNewLogin(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <input
            className="taxi-input"
            placeholder="Пароль"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <input
            className="taxi-input"
            placeholder="Имя"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <input
            className="taxi-input"
            placeholder="Телефон"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          <button className="btn-yellow" onClick={handleAddDriver} style={{ padding: 12, fontSize: 14 }}>
            Зарегистрировать
          </button>
        </div>
      )}

      {drivers.map((driver, idx) => {
        const subActive = isSubscriptionActive(driver);
        const daysLeft = subscriptionDaysLeft(driver);
        const driverSubDays = subDaysInput[driver.id] ?? driver.subscriptionDays;

        return (
          <div
            key={driver.id}
            className="taxi-card animate-fade-slide-up"
            style={{ marginBottom: 10, animationDelay: `${idx * 0.05}s` }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  background: "var(--taxi-surface)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name="User" size={18} color="var(--taxi-muted)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: "#F0F2F5", fontWeight: 600 }}>{driver.name}</div>
                <div style={{ fontSize: 11, color: "var(--taxi-muted)" }}>{driver.phone} · {driver.login}</div>
              </div>
              <div
                style={{
                  ...badgeBase,
                  background:
                    driver.status === "active"
                      ? "rgba(34,197,94,0.15)"
                      : driver.status === "busy"
                      ? "rgba(96,165,250,0.15)"
                      : "rgba(239,68,68,0.15)",
                  color:
                    driver.status === "active"
                      ? "var(--taxi-green)"
                      : driver.status === "busy"
                      ? "#60A5FA"
                      : "var(--taxi-red)",
                }}
              >
                {driver.status === "active" ? "Активен" : driver.status === "busy" ? "Занят" : "Ограничен"}
              </div>
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              <button
                onClick={() =>
                  onUpdateDriver(
                    driver.id,
                    driver.status === "restricted" ? { status: "active" } : { status: "restricted" }
                  )
                }
                style={{
                  padding: "5px 10px",
                  background: driver.status === "restricted" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                  border: `1px solid ${driver.status === "restricted" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                  borderRadius: 8,
                  color: driver.status === "restricted" ? "var(--taxi-green)" : "var(--taxi-red)",
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "Golos Text",
                  fontWeight: 600,
                }}
              >
                {driver.status === "restricted" ? "Разблокировать" : "Ограничить"}
              </button>
              <button
                onClick={() => setConfirmDeleteDriver(driver.id)}
                style={{
                  padding: "5px 10px",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 8,
                  color: "var(--taxi-red)",
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "Golos Text",
                }}
              >
                <Icon name="Trash2" size={11} /> Удалить
              </button>
            </div>

            <div style={{ borderTop: "1px solid var(--taxi-border)", paddingTop: 10 }}>
              <div style={{ ...mutedText, fontSize: 11, marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Подписка
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: subActive ? "var(--taxi-green)" : "var(--taxi-red)" }}>
                  {driver.freeWork ? "Бесплатная работа" : subActive ? `Активна (${daysLeft} дн.)` : "Неактивна"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={driverSubDays}
                  onChange={(e) => setSubDaysInput((prev) => ({ ...prev, [driver.id]: Math.min(60, Math.max(1, Number(e.target.value))) }))}
                  className="taxi-input"
                  style={{ width: 70, padding: "6px 8px", fontSize: 12, textAlign: "center" }}
                />
                <span style={{ fontSize: 11, color: "var(--taxi-muted)" }}>дней</span>
                <button
                  onClick={() => handleSetSubscription(driver.id, driverSubDays)}
                  style={{
                    padding: "5px 10px",
                    background: "var(--taxi-yellow)",
                    border: "none",
                    borderRadius: 8,
                    color: "var(--taxi-dark)",
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "Montserrat",
                    fontWeight: 700,
                  }}
                >
                  Установить
                </button>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 6 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#F0F2F5", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={driver.freeWork}
                    onChange={(e) => onUpdateDriver(driver.id, { freeWork: e.target.checked })}
                    style={{ accentColor: "var(--taxi-yellow)" }}
                  />
                  Бесплатная работа
                </label>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--taxi-border)", paddingTop: 10, marginTop: 6 }}>
              <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#F0F2F5", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={driver.hasAds}
                    onChange={(e) => onUpdateDriver(driver.id, { hasAds: e.target.checked })}
                    style={{ accentColor: "var(--taxi-yellow)" }}
                  />
                  Реклама
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, color: "var(--taxi-muted)" }}>Приоритет:</span>
                  <select
                    value={driver.priority}
                    onChange={(e) => onUpdateDriver(driver.id, { priority: Number(e.target.value) })}
                    style={{
                      background: "var(--taxi-surface)",
                      border: "1px solid var(--taxi-border)",
                      borderRadius: 8,
                      color: "#F0F2F5",
                      padding: "4px 8px",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {[1, 2, 3, 4, 5].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {confirmDeleteDriver && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            padding: 24,
          }}
          onClick={() => setConfirmDeleteDriver(null)}
        >
          <div
            className="taxi-card animate-fade-slide-up"
            style={{ width: "calc(100% - 24px)", maxWidth: 300, textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            <Icon name="AlertTriangle" size={32} color="var(--taxi-red)" />
            <div style={{ ...headingStyle, fontSize: 15, margin: "12px 0 8px" }}>Удалить водителя?</div>
            <div style={{ ...mutedText, marginBottom: 16 }}>Это действие нельзя отменить</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setConfirmDeleteDriver(null)}
                style={{
                  flex: 1,
                  padding: 10,
                  background: "var(--taxi-surface)",
                  border: "1px solid var(--taxi-border)",
                  borderRadius: 12,
                  color: "#F0F2F5",
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "Golos Text",
                }}
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  onDeleteDriver(confirmDeleteDriver);
                  setConfirmDeleteDriver(null);
                }}
                style={{
                  flex: 1,
                  padding: 10,
                  background: "rgba(239,68,68,0.2)",
                  border: "1px solid rgba(239,68,68,0.4)",
                  borderRadius: 12,
                  color: "var(--taxi-red)",
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "Montserrat",
                  fontWeight: 700,
                }}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderTariffs = () => {
    const previewPrice = calcOrderPrice(previewKm, localSettings, "economy");

    const handleCoeffSave = (idx: number) => {
      const updated = [...localSettings.timeCoefficients];
      updated[idx] = { from: coeffFrom, to: coeffTo, coeff: coeffVal };
      setLocalSettings({ ...localSettings, timeCoefficients: updated });
      setEditCoeffIdx(null);
    };

    const handleCoeffAdd = () => {
      setLocalSettings({
        ...localSettings,
        timeCoefficients: [...localSettings.timeCoefficients, { from: coeffFrom, to: coeffTo, coeff: coeffVal }],
      });
      setAddingCoeff(false);
      setCoeffFrom(0);
      setCoeffTo(0);
      setCoeffVal(1);
    };

    const handleCoeffDelete = (idx: number) => {
      const updated = localSettings.timeCoefficients.filter((_, i) => i !== idx);
      setLocalSettings({ ...localSettings, timeCoefficients: updated });
    };

    return (
      <div className="animate-fade-slide-up">
        <div style={{ ...headingStyle, fontSize: 18, marginBottom: 16 }}>Тарифы и настройки</div>

        <div className="taxi-card" style={{ marginBottom: 12 }}>
          <div style={labelRow}>
            <span style={{ fontSize: 13, color: "var(--taxi-muted)" }}>Первый км</span>
            <span style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, color: "var(--taxi-yellow)" }}>
              {localSettings.priceFirstKm} ₽
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={200}
            step={1}
            value={localSettings.priceFirstKm}
            onChange={(e) => setLocalSettings({ ...localSettings, priceFirstKm: Number(e.target.value) })}
            style={sliderStyle}
          />
        </div>

        <div className="taxi-card" style={{ marginBottom: 12 }}>
          <div style={labelRow}>
            <span style={{ fontSize: 13, color: "var(--taxi-muted)" }}>За км</span>
            <span style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, color: "var(--taxi-yellow)" }}>
              {localSettings.pricePerKm} ₽
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={100}
            step={1}
            value={localSettings.pricePerKm}
            onChange={(e) => setLocalSettings({ ...localSettings, pricePerKm: Number(e.target.value) })}
            style={sliderStyle}
          />
        </div>

        <div className="taxi-card" style={{ marginBottom: 12 }}>
          <div style={labelRow}>
            <span style={{ fontSize: 13, color: "var(--taxi-muted)" }}>Грузовой тариф</span>
            <span style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, color: "var(--taxi-yellow)" }}>
              {localSettings.pricePerHour} ₽/ч
            </span>
          </div>
          <input
            type="range"
            min={100}
            max={3000}
            step={10}
            value={localSettings.pricePerHour}
            onChange={(e) => setLocalSettings({ ...localSettings, pricePerHour: Number(e.target.value) })}
            style={sliderStyle}
          />
        </div>

        <div className="taxi-card" style={{ marginBottom: 12 }}>
          <div style={labelRow}>
            <span style={{ fontSize: 13, color: "var(--taxi-muted)" }}>Ожидание за мин</span>
            <span style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, color: "var(--taxi-yellow)" }}>
              {localSettings.priceWaitingPerMin} ₽
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={15}
            step={1}
            value={localSettings.priceWaitingPerMin}
            onChange={(e) => setLocalSettings({ ...localSettings, priceWaitingPerMin: Number(e.target.value) })}
            style={sliderStyle}
          />
        </div>

        <div className="taxi-card" style={{ marginBottom: 12 }}>
          <div style={labelRow}>
            <span style={{ fontSize: 13, color: "var(--taxi-muted)" }}>Радиус авто-назначения</span>
            <span style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, color: "var(--taxi-yellow)" }}>
              {localSettings.autoAssignRadiusKm} км
            </span>
          </div>
          <input
            type="range"
            min={0.8}
            max={30}
            step={0.1}
            value={localSettings.autoAssignRadiusKm}
            onChange={(e) => setLocalSettings({ ...localSettings, autoAssignRadiusKm: parseFloat(Number(e.target.value).toFixed(1)) })}
            style={sliderStyle}
          />
        </div>

        <div className="taxi-card" style={{ marginBottom: 12 }}>
          <div style={labelRow}>
            <span style={{ fontSize: 13, color: "var(--taxi-muted)" }}>Глобальная скидка</span>
            <span style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, color: "var(--taxi-yellow)" }}>
              {localSettings.globalDiscount}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={15}
            step={1}
            value={localSettings.globalDiscount}
            onChange={(e) => setLocalSettings({ ...localSettings, globalDiscount: Number(e.target.value) })}
            style={sliderStyle}
          />
        </div>

        <div className="taxi-card" style={{ marginBottom: 12 }}>
          <div style={labelRow}>
            <span style={{ fontSize: 13, color: "var(--taxi-muted)" }}>Порог км-скидки</span>
            <span style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, color: "var(--taxi-yellow)" }}>
              {localSettings.kmDiscountThreshold} км
            </span>
          </div>
          <input
            type="range"
            min={4}
            max={400}
            step={1}
            value={localSettings.kmDiscountThreshold}
            onChange={(e) => setLocalSettings({ ...localSettings, kmDiscountThreshold: Number(e.target.value) })}
            style={sliderStyle}
          />
          <div style={{ ...labelRow, marginTop: 10 }}>
            <span style={{ fontSize: 13, color: "var(--taxi-muted)" }}>Км-скидка</span>
            <span style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, color: "var(--taxi-yellow)" }}>
              {localSettings.kmDiscount}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={15}
            step={1}
            value={localSettings.kmDiscount}
            onChange={(e) => setLocalSettings({ ...localSettings, kmDiscount: Number(e.target.value) })}
            style={sliderStyle}
          />
        </div>

        <div className="taxi-card" style={{ marginBottom: 12 }}>
          <div style={labelRow}>
            <span style={{ fontSize: 13, color: "var(--taxi-muted)" }}>Режим авто-назначения</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {(["rating", "trips", "ads"] as AutoAssignMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setLocalSettings({ ...localSettings, autoAssignMode: mode })}
                style={{
                  flex: 1,
                  padding: "8px 4px",
                  background: localSettings.autoAssignMode === mode ? "var(--taxi-yellow)" : "var(--taxi-surface)",
                  border: `1px solid ${localSettings.autoAssignMode === mode ? "var(--taxi-yellow)" : "var(--taxi-border)"}`,
                  borderRadius: 10,
                  color: localSettings.autoAssignMode === mode ? "var(--taxi-dark)" : "var(--taxi-muted)",
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "Montserrat",
                  fontWeight: 700,
                }}
              >
                {mode === "rating" ? "Рейтинг" : mode === "trips" ? "Поездки" : "Реклама"}
              </button>
            ))}
          </div>
        </div>

        <div className="taxi-card" style={{ marginBottom: 12 }}>
          <div style={labelRow}>
            <span style={{ fontSize: 13, color: "var(--taxi-muted)" }}>Свободный заказ через</span>
            <span style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, color: "var(--taxi-yellow)" }}>
              {Math.round(localSettings.freeOrderTimeoutMs / 60000)} мин
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={Math.round(localSettings.freeOrderTimeoutMs / 60000)}
            onChange={(e) => setLocalSettings({ ...localSettings, freeOrderTimeoutMs: Number(e.target.value) * 60000 })}
            style={sliderStyle}
          />
        </div>

        <div style={sectionTitle}>Временные коэффициенты</div>
        <div className="taxi-card" style={{ marginBottom: 12 }}>
          {localSettings.timeCoefficients.map((tc, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderBottom: idx < localSettings.timeCoefficients.length - 1 ? "1px solid var(--taxi-border)" : "none",
              }}
            >
              {editCoeffIdx === idx ? (
                <div style={{ display: "flex", gap: 6, alignItems: "center", flex: 1, flexWrap: "wrap" }}>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={coeffFrom}
                    onChange={(e) => setCoeffFrom(Number(e.target.value))}
                    className="taxi-input"
                    style={{ width: 48, padding: "4px 6px", fontSize: 12, textAlign: "center" }}
                  />
                  <span style={{ fontSize: 11, color: "var(--taxi-muted)" }}>-</span>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={coeffTo}
                    onChange={(e) => setCoeffTo(Number(e.target.value))}
                    className="taxi-input"
                    style={{ width: 48, padding: "4px 6px", fontSize: 12, textAlign: "center" }}
                  />
                  <span style={{ fontSize: 11, color: "var(--taxi-muted)" }}>x</span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    step={0.1}
                    value={coeffVal}
                    onChange={(e) => setCoeffVal(Number(e.target.value))}
                    className="taxi-input"
                    style={{ width: 56, padding: "4px 6px", fontSize: 12, textAlign: "center" }}
                  />
                  <button
                    onClick={() => handleCoeffSave(idx)}
                    style={{ padding: "4px 8px", background: "var(--taxi-yellow)", border: "none", borderRadius: 6, color: "var(--taxi-dark)", fontSize: 11, cursor: "pointer", fontWeight: 700 }}
                  >
                    OK
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, color: "#F0F2F5" }}>
                      {String(tc.from).padStart(2, "0")}:00 - {String(tc.to).padStart(2, "0")}:00
                    </span>
                    <span style={{ marginLeft: 8, fontFamily: "Montserrat", fontWeight: 700, fontSize: 13, color: "var(--taxi-yellow)" }}>
                      x{tc.coeff}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={() => {
                        setEditCoeffIdx(idx);
                        setCoeffFrom(tc.from);
                        setCoeffTo(tc.to);
                        setCoeffVal(tc.coeff);
                      }}
                      style={{ padding: "3px 7px", background: "var(--taxi-surface)", border: "1px solid var(--taxi-border)", borderRadius: 6, color: "var(--taxi-yellow)", fontSize: 11, cursor: "pointer" }}
                    >
                      <Icon name="Pencil" size={11} />
                    </button>
                    <button
                      onClick={() => handleCoeffDelete(idx)}
                      style={{ padding: "3px 7px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, color: "var(--taxi-red)", fontSize: 11, cursor: "pointer" }}
                    >
                      <Icon name="X" size={11} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {addingCoeff ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center", paddingTop: 8, flexWrap: "wrap" }}>
              <input
                type="number"
                min={0}
                max={23}
                value={coeffFrom}
                onChange={(e) => setCoeffFrom(Number(e.target.value))}
                className="taxi-input"
                style={{ width: 48, padding: "4px 6px", fontSize: 12, textAlign: "center" }}
              />
              <span style={{ fontSize: 11, color: "var(--taxi-muted)" }}>-</span>
              <input
                type="number"
                min={0}
                max={23}
                value={coeffTo}
                onChange={(e) => setCoeffTo(Number(e.target.value))}
                className="taxi-input"
                style={{ width: 48, padding: "4px 6px", fontSize: 12, textAlign: "center" }}
              />
              <span style={{ fontSize: 11, color: "var(--taxi-muted)" }}>x</span>
              <input
                type="number"
                min={1}
                max={5}
                step={0.1}
                value={coeffVal}
                onChange={(e) => setCoeffVal(Number(e.target.value))}
                className="taxi-input"
                style={{ width: 56, padding: "4px 6px", fontSize: 12, textAlign: "center" }}
              />
              <button
                onClick={handleCoeffAdd}
                style={{ padding: "4px 8px", background: "var(--taxi-yellow)", border: "none", borderRadius: 6, color: "var(--taxi-dark)", fontSize: 11, cursor: "pointer", fontWeight: 700 }}
              >
                OK
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setAddingCoeff(true);
                setCoeffFrom(0);
                setCoeffTo(0);
                setCoeffVal(1.0);
              }}
              style={{
                marginTop: 8,
                padding: "6px 12px",
                background: "var(--taxi-surface)",
                border: "1px solid var(--taxi-border)",
                borderRadius: 8,
                color: "var(--taxi-yellow)",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "Golos Text",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Icon name="Plus" size={12} /> Добавить
            </button>
          )}
        </div>

        <div style={sectionTitle}>Предварительный расчёт</div>
        <div className="taxi-card" style={{ marginBottom: 16 }}>
          <div style={labelRow}>
            <span style={{ fontSize: 13, color: "var(--taxi-muted)" }}>Расстояние</span>
            <span style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, color: "#F0F2F5" }}>
              {previewKm} км
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={previewKm}
            onChange={(e) => setPreviewKm(Number(e.target.value))}
            style={sliderStyle}
          />
          <div
            style={{
              marginTop: 12,
              padding: "12px",
              background: "var(--taxi-surface)",
              borderRadius: 12,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--taxi-muted)", marginBottom: 4 }}>Стоимость поездки</div>
            <div style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 28, color: "var(--taxi-yellow)" }}>
              {previewPrice} ₽
            </div>
          </div>
        </div>

        <button
          className="btn-yellow"
          onClick={handleSaveTariffs}
          style={{ marginBottom: 16 }}
        >
          {tariffSaved ? "Сохранено!" : "Сохранить тарифы"}
        </button>
      </div>
    );
  };

  const renderChat = () => {
    const groupEntries = Object.entries(chatGroups);

    if (chatUser) {
      const group = chatGroups[chatUser];
      const messages = group?.messages || [];
      const userName = group?.name || "Пользователь";
      const userRole = group?.role || "passenger";

      return (
        <div className="animate-fade-slide-up" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <button
              onClick={() => setChatUser(null)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--taxi-yellow)", padding: 0 }}
            >
              <Icon name="ArrowLeft" size={20} />
            </button>
            <div
              style={{
                width: 36,
                height: 36,
                background: "var(--taxi-surface)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon name={userRole === "driver" ? "Car" : "User"} size={16} color="var(--taxi-muted)" />
            </div>
            <div>
              <div style={{ fontSize: 14, color: "#F0F2F5", fontWeight: 600 }}>{userName}</div>
              <div style={{ fontSize: 11, color: "var(--taxi-muted)" }}>
                {userRole === "driver" ? "Водитель" : "Пассажир"}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", padding: "var(--page-px)", color: "var(--taxi-muted)", fontSize: 13 }}>
                Нет сообщений
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.fromRole === "admin" ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                }}
              >
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: msg.fromRole === "admin" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: msg.fromRole === "admin" ? "var(--taxi-yellow)" : "var(--taxi-surface)",
                    color: msg.fromRole === "admin" ? "var(--taxi-dark)" : "#F0F2F5",
                    fontSize: 13,
                    fontFamily: "Golos Text",
                  }}
                >
                  {msg.text}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--taxi-muted)",
                    marginTop: 2,
                    textAlign: msg.fromRole === "admin" ? "right" : "left",
                  }}
                >
                  {msg.time}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="taxi-input"
              placeholder="Написать ответ..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
              style={{ flex: 1, padding: "10px 14px", fontSize: 13 }}
            />
            <button
              onClick={handleSendChat}
              style={{
                width: 44,
                height: 44,
                background: "var(--taxi-yellow)",
                border: "none",
                borderRadius: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon name="Send" size={18} color="var(--taxi-dark)" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="animate-fade-slide-up">
        <div style={{ ...headingStyle, fontSize: 18, marginBottom: 16 }}>Чат поддержки</div>
        {groupEntries.length === 0 ? (
          <div className="taxi-card" style={{ textAlign: "center", padding: 30 }}>
            <Icon name="MessageSquare" size={36} color="var(--taxi-muted)" />
            <div style={{ ...headingStyle, fontSize: 15, marginTop: 12, marginBottom: 6 }}>Нет обращений</div>
            <div style={{ fontSize: 13, color: "var(--taxi-muted)" }}>Сообщения от пассажиров и водителей появятся здесь</div>
          </div>
        ) : (
          groupEntries.map(([userId, group], idx) => {
            const lastMsg = group.messages[group.messages.length - 1];
            const unread = group.messages.filter((m) => m.fromRole !== "admin" && !m.read).length;

            return (
              <div
                key={userId}
                className="taxi-card animate-fade-slide-up"
                style={{ marginBottom: 8, cursor: "pointer", animationDelay: `${idx * 0.05}s` }}
                onClick={() => setChatUser(userId)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      background: "var(--taxi-surface)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      position: "relative",
                    }}
                  >
                    <Icon name={group.role === "driver" ? "Car" : "User"} size={18} color="var(--taxi-muted)" />
                    {unread > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: -2,
                          right: -2,
                          width: 16,
                          height: 16,
                          background: "var(--taxi-red)",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 9,
                          color: "#fff",
                          fontWeight: 700,
                        }}
                      >
                        {unread}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "#F0F2F5", fontWeight: 600 }}>{group.name}</span>
                      <span style={{ fontSize: 10, color: "var(--taxi-muted)" }}>{lastMsg?.time}</span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--taxi-muted)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        marginTop: 2,
                      }}
                    >
                      {lastMsg?.fromRole === "admin" ? "Вы: " : ""}
                      {lastMsg?.text}
                    </div>
                  </div>
                  <Icon name="ChevronRight" size={16} color="var(--taxi-muted)" />
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--taxi-dark)" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "14px var(--page-px)", paddingBottom: 80 }}>
        {tab === "overview" && renderOverview()}
        {tab === "stats" && renderStats()}
        {tab === "drivers" && renderDrivers()}
        {tab === "tariffs" && renderTariffs()}
        {tab === "chat" && renderChat()}
      </div>

      <div className="nav-bar">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${tab === item.id ? "active" : ""}`}
            onClick={() => setTab(item.id)}
          >
            <Icon name={item.icon} size={22} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}