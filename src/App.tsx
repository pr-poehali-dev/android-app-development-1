import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import AuthScreen from "./pages/taxi/AuthScreen";
import PassengerOrderScreen from "./pages/taxi/PassengerOrderScreen";
import HistoryScreen from "./pages/taxi/HistoryScreen";
import ProfileScreen from "./pages/taxi/ProfileScreen";
import DriverScreen from "./pages/taxi/DriverScreen";
import AdminScreen from "./pages/taxi/AdminScreen";
import Icon from "@/components/ui/icon";
import {
  User, Order, Driver, AppSettings, DriverCarInfo, SupportMessage,
  INITIAL_DRIVERS, INITIAL_ORDERS, INITIAL_SETTINGS, INITIAL_PASSENGERS,
} from "./pages/taxi/types";
import {
  requestNotificationPermission, saveSession, loadSession, clearSession, sendPush, playNotificationSound,
} from "./pages/taxi/notifications";
import api from "./pages/taxi/api";

type PassengerTab = "profile" | "order" | "history";

const PASSENGER_NAV = [
  { id: "profile", label: "Профиль", icon: "User" },
  { id: "order", label: "Заказ", icon: "Car" },
  { id: "history", label: "История", icon: "Clock" },
] as const;

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<PassengerTab>("order");
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [repeatFrom, setRepeatFrom] = useState("");
  const [repeatTo, setRepeatTo] = useState("");
  const [drivers, setDrivers] = useState<Driver[]>(INITIAL_DRIVERS);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [passengers, setPassengers] = useState<User[]>(INITIAL_PASSENGERS);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const pendingDriversRef = useRef<Set<string>>(new Set());

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const pollHashRef = useRef("");
  const pollIntervalRef = useRef(3000);
  const idleCountRef = useRef(0);

  const fullSync = useCallback(async () => {
    if (!api.isConnected()) return false;
    const data = await api.getState("admin");
    if (data && data.settings) {
      setSettings(data.settings);
      setOrders(data.orders || []);
      setPassengers(data.passengers || []);
      setSupportMessages(data.supportMessages || []);
      const serverDrivers = data.drivers || [];
      if (pendingDriversRef.current.size > 0) {
        setDrivers((prev) => {
          const serverIds = new Set(serverDrivers.map((d: Driver) => d.id));
          const pendingLocal = prev.filter((d) => pendingDriversRef.current.has(d.id) && !serverIds.has(d.id));
          return [...serverDrivers, ...pendingLocal];
        });
      } else {
        setDrivers(serverDrivers);
      }
      setDbReady(true);
      return true;
    }
    return false;
  }, []);

  const smartPoll = useCallback(async () => {
    if (!api.isConnected() || !user) return;
    const res = await api.poll(user.role, user.id, pollHashRef.current);
    if (!res) return;
    if (res.changed) {
      pollHashRef.current = res.hash || "";
      idleCountRef.current = 0;
      pollIntervalRef.current = 2000;
      await fullSync();
    } else {
      pollHashRef.current = res.hash || pollHashRef.current;
      idleCountRef.current++;
      if (idleCountRef.current < 5) pollIntervalRef.current = 3000;
      else if (idleCountRef.current < 20) pollIntervalRef.current = 5000;
      else if (idleCountRef.current < 60) pollIntervalRef.current = 10000;
      else pollIntervalRef.current = 20000;
    }
  }, [user, fullSync]);

  useEffect(() => {
    requestNotificationPermission();
    const init = async () => {
      let synced = await fullSync();
      if (!synced) {
        await new Promise((r) => setTimeout(r, 2000));
        synced = await fullSync();
      }
      if (!synced) setDbReady(true);
      const session = loadSession();
      if (session) {
        if (session.role === "admin") {
          setUser({ id: session.userId, name: session.name, phone: session.phone, role: "admin" });
        } else if (session.role === "driver") {
          setUser({ id: session.userId, name: session.name, phone: session.phone, role: "driver" });
        } else {
          const res = await api.authPassenger({ id: session.userId, name: session.name, phone: session.phone });
          if (res && res.id && !res.error) {
            saveSession({ userId: res.id, role: "passenger", name: res.name, phone: res.phone });
            setUser({ id: res.id, name: res.name, phone: res.phone, role: "passenger" });
          } else {
            setUser({ id: session.userId, name: session.name, phone: session.phone, role: "passenger" });
          }
        }
      }
      setLoaded(true);
    };
    init();
  }, [fullSync]);

  useEffect(() => {
    if (!user) return;
    let timeoutId: ReturnType<typeof setTimeout>;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await smartPoll();
      if (!cancelled) timeoutId = setTimeout(tick, pollIntervalRef.current);
    };
    timeoutId = setTimeout(tick, pollIntervalRef.current);
    const onFocus = () => {
      idleCountRef.current = 0;
      pollIntervalRef.current = 2000;
      smartPoll();
    };
    const onBlur = () => {
      pollIntervalRef.current = 15000;
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, [user, smartPoll]);

  const handleAuth = (u: User) => {
    setUser(u);
    pollHashRef.current = "";
    idleCountRef.current = 0;
    pollIntervalRef.current = 1000;
    const dLogin = u.role === "driver" ? drivers.find((d) => d.id === u.id)?.login : undefined;
    saveSession({ userId: u.id, role: u.role, name: u.name, phone: u.phone, driverLogin: dLogin });
    if (u.role === "passenger") {
      api.authPassenger({ id: u.id, name: u.name, phone: u.phone });
      const exists = passengers.find((p) => p.phone === u.phone);
      if (!exists) {
        setPassengers((prev) => [...prev, { ...u, registeredAt: new Date().toISOString().slice(0, 10) }]);
      }
    }
    fullSync();
  };

  const handleLogout = () => {
    setUser(null);
    setTab("order");
    clearSession();
  };

  const handleRepeat = (from: string, to: string) => {
    setRepeatFrom(from);
    setRepeatTo(to);
    setTab("order");
  };

  const triggerPoll = useCallback(() => {
    pollHashRef.current = "";
    idleCountRef.current = 0;
    pollIntervalRef.current = 1000;
  }, []);

  const handleOrderCreate = (order: Order) => {
    setOrders((prev) => [...prev, order]);
    api.createOrder(order as unknown as Record<string, unknown>).then(triggerPoll);
  };

  const handleOrderCancel = (id: string, by?: "passenger" | "driver" | "admin") => {
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "cancelled" as const, cancelledBy: by || "passenger" } : o));
    api.cancelOrder(id, by || "passenger").then(triggerPoll);
  };

  const handleAcceptOrder = (orderId: string, driverId: string, driverName: string, eta?: number) => {
    const dr = drivers.find(d => d.id === driverId);
    const driverPhone = dr?.phone || "";
    const driverCar = dr?.car || "";
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: "assigned" as const, driverId, driverName, driverPhone, driverCar, etaMinutes: eta } : o));
    api.acceptOrder({ orderId, driverId, driverName, eta }).then(triggerPoll);
  };

  const handleToggleAutoAssign = (driverId: string) => {
    setDrivers((prev) => prev.map((d) => d.id === driverId ? { ...d, autoAssign: !d.autoAssign } : d));
    api.toggleAutoAssign(driverId);
  };

  const handleUpdateDriver = (id: string, changes: Partial<Driver>) => {
    setDrivers((prev) => prev.map((d) => d.id === id ? { ...d, ...changes } : d));
    api.updateDriver(id, changes as Record<string, unknown>);
  };

  const handleAddDriver = async (d: Driver) => {
    pendingDriversRef.current.add(d.id);
    setDrivers((prev) => [...prev, d]);

    let res = await api.addDriver(d as unknown as Record<string, unknown>);
    if (!res) {
      await new Promise((r) => setTimeout(r, 3000));
      res = await api.addDriver(d as unknown as Record<string, unknown>);
    }

    pendingDriversRef.current.delete(d.id);

    if (res && res.error) {
      setDrivers((prev) => prev.filter((dr) => dr.id !== d.id));
      showToast(res.error, "error");
    } else if (res && res.ok) {
      showToast(`Водитель ${d.name} добавлен`, "success");
      loadFromDb();
    } else {
      showToast("Нет связи с сервером. Попробуйте позже", "error");
      setDrivers((prev) => prev.filter((dr) => dr.id !== d.id));
    }
  };

  const handleUpdateDriverCar = (driverId: string, carInfo: DriverCarInfo) => {
    setDrivers((prev) => prev.map((d) => d.id === driverId ? { ...d, carInfo, car: `${carInfo.brand} ${carInfo.model} • ${carInfo.plateNumber}` } : d));
    api.updateDriverCar(driverId, carInfo);
  };

  const handleRateDriver = (driverId: string, rating: number) => {
    if (rating === 0) return;
    setDrivers((prev) => prev.map((d) => {
      if (d.id !== driverId) return d;
      const totalRating = d.rating * d.tripsCount + rating;
      const newCount = d.tripsCount + 1;
      return { ...d, rating: Math.round((totalRating / newCount) * 10) / 10, tripsCount: newCount };
    }));
    api.rateDriver(driverId, rating);
  };

  const handleDeleteDriver = (id: string) => {
    setDrivers((prev) => prev.filter((d) => d.id !== id));
    api.deleteDriver(id).then(triggerPoll);
  };

  const handleDeleteUser = (id: string) => {
    setPassengers((prev) => prev.filter((p) => p.id !== id));
    setDrivers((prev) => prev.filter((d) => d.id !== id));
    api.deleteUser(id).then(triggerPoll);
  };

  const handleUpdateOrderStatus = (orderId: string, status: Order["status"]) => {
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
    api.updateOrder(orderId, status).then(triggerPoll);
  };

  const handleUpdateOrder = (orderId: string, changes: Partial<Order>) =>
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, ...changes } : o));

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    api.updateSettings(newSettings as unknown as Record<string, unknown>);
  };

  const handleSendSupport = (msg: SupportMessage) => {
    setSupportMessages((prev) => [...prev, msg]);
    api.sendSupport(msg as unknown as Record<string, unknown>).then(triggerPoll);
  };

  const handleMarkMessagesRead = (userId: string, readerRole: "admin" | "passenger" | "driver") => {
    setSupportMessages((prev) =>
      prev.map((m) => {
        if (readerRole === "admin" && m.fromId === userId && m.fromRole !== "admin" && !m.read) {
          return { ...m, read: true };
        }
        if ((readerRole === "passenger" || readerRole === "driver") && m.fromId === userId && m.fromRole === "admin" && !m.read) {
          return { ...m, read: true };
        }
        return m;
      })
    );
    api.markRead(userId, readerRole);
  };

  const currentDriver = user?.role === "driver" ? drivers.find((d) => d.id === user.id) ?? null : null;

  const passengerUnread = useMemo(() => {
    if (!user || user.role !== "passenger") return 0;
    return supportMessages.filter((m) => m.fromRole === "admin" && m.fromId === user.id && !m.read).length;
  }, [supportMessages, user]);

  const prevPassengerMsgCount = useRef(supportMessages.length);
  useEffect(() => {
    if (!user || user.role !== "passenger") return;
    const adminMsgsForMe = supportMessages.filter((m) => m.fromRole === "admin" && m.fromId === user.id);
    if (adminMsgsForMe.length > prevPassengerMsgCount.current && prevPassengerMsgCount.current > 0) {
      const newMsgs = adminMsgsForMe.slice(prevPassengerMsgCount.current);
      const unread = newMsgs.filter((m) => !m.read);
      if (unread.length > 0) {
        playNotificationSound("message");
        sendPush("Поддержка", unread[unread.length - 1].text.slice(0, 80));
      }
    }
    prevPassengerMsgCount.current = adminMsgsForMe.length;
  }, [supportMessages, user]);

  if (!loaded) return null;

  return (
    <div className="app-container">
      {toast && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
          background: toast.type === "error" ? "rgba(239,68,68,0.95)" : "rgba(34,197,94,0.95)",
          color: "#fff", padding: "10px 20px", borderRadius: 12, fontSize: 14, fontWeight: 600,
          zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", maxWidth: "90%", textAlign: "center",
          animation: "fadeSlideUp 0.3s ease",
        }}>
          {toast.text}
        </div>
      )}
      {!user ? (
        <AuthScreen onAuth={handleAuth} drivers={drivers} settings={settings} />
      ) : user.role === "admin" ? (
        <AdminScreen
          drivers={drivers}
          orders={orders}
          settings={settings}
          passengers={passengers}
          supportMessages={supportMessages}
          onUpdateSettings={handleUpdateSettings}
          onUpdateDriver={handleUpdateDriver}
          onAddDriver={handleAddDriver}
          onDeleteDriver={handleDeleteDriver}
          onDeleteUser={handleDeleteUser}
          onLogout={handleLogout}
          onCancelOrder={handleOrderCancel}
          onUpdateOrder={handleUpdateOrder}
          onSendSupport={handleSendSupport}
          onAcceptOrder={handleAcceptOrder}
          onMarkMessagesRead={handleMarkMessagesRead}
        />
      ) : user.role === "driver" && currentDriver ? (
        <DriverScreen
          driver={currentDriver}
          orders={orders}
          settings={settings}
          onAcceptOrder={handleAcceptOrder}
          onToggleAutoAssign={handleToggleAutoAssign}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onUpdateDriverCar={handleUpdateDriverCar}
          onLogout={handleLogout}
          onSendSupport={handleSendSupport}
          supportMessages={supportMessages}
          userId={user.id}
          onMarkMessagesRead={handleMarkMessagesRead}
        />
      ) : (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
          <div style={{ flex: 1, overflow: "hidden" }}>
            {tab === "profile" && <ProfileScreen user={user} onLogout={handleLogout} onSendSupport={handleSendSupport} supportMessages={supportMessages} onMarkMessagesRead={handleMarkMessagesRead} />}
            {tab === "order" && (
              <PassengerOrderScreen
                user={user}
                orders={orders}
                settings={settings}
                drivers={drivers}
                onOrderCreate={handleOrderCreate}
                onOrderCancel={handleOrderCancel}
                onRateDriver={handleRateDriver}
                initialFrom={repeatFrom}
                initialTo={repeatTo}
              />
            )}
            {tab === "history" && (
              <HistoryScreen
                orders={orders.filter((o) => o.passengerId === user.id)}
                onRepeat={handleRepeat}
              />
            )}
          </div>
          <div className="nav-bar">
            {PASSENGER_NAV.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${tab === item.id ? "active" : ""}`}
                onClick={() => setTab(item.id as PassengerTab)}
              >
                <div style={{ position: "relative", display: "inline-flex" }}>
                  <Icon name={item.icon} fallback="Circle" size={22} />
                  {item.id === "profile" && passengerUnread > 0 && (
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
                      {passengerUnread > 99 ? "99+" : passengerUnread}
                    </span>
                  )}
                </div>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}