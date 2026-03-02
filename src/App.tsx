import { useState, useEffect } from "react";
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
  requestNotificationPermission, saveSession, loadSession, clearSession,
} from "./pages/taxi/notifications";

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

  useEffect(() => {
    requestNotificationPermission();
    const session = loadSession();
    if (session) {
      if (session.role === "admin") {
        setUser({ id: session.userId, name: session.name, phone: session.phone, role: "admin" });
      } else if (session.role === "driver") {
        const d = session.driverLogin ? INITIAL_DRIVERS.find((dr) => dr.login === session.driverLogin) : undefined;
        if (d) setUser({ id: d.id, name: d.name, phone: d.phone, role: "driver" });
      } else {
        setUser({ id: session.userId, name: session.name, phone: session.phone, role: "passenger" });
      }
    }
    setLoaded(true);
  }, []);

  const handleAuth = (u: User) => {
    setUser(u);
    const dLogin = u.role === "driver" ? drivers.find((d) => d.id === u.id)?.login : undefined;
    saveSession({ userId: u.id, role: u.role, name: u.name, phone: u.phone, driverLogin: dLogin });
    if (u.role === "passenger") {
      const exists = passengers.find((p) => p.phone === u.phone);
      if (!exists) {
        setPassengers((prev) => [...prev, { ...u, registeredAt: new Date().toISOString().slice(0, 10) }]);
      }
    }
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

  const handleOrderCreate = (order: Order) => setOrders((prev) => [...prev, order]);
  const handleOrderCancel = (id: string, by?: "passenger" | "driver" | "admin") =>
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "cancelled", cancelledBy: by || "passenger" } : o));
  const handleAcceptOrder = (orderId: string, driverId: string, driverName: string, eta?: number) =>
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: "assigned", driverId, driverName, etaMinutes: eta } : o));
  const handleToggleAutoAssign = (driverId: string) =>
    setDrivers((prev) => prev.map((d) => d.id === driverId ? { ...d, autoAssign: !d.autoAssign } : d));
  const handleUpdateDriver = (id: string, changes: Partial<Driver>) =>
    setDrivers((prev) => prev.map((d) => d.id === id ? { ...d, ...changes } : d));
  const handleAddDriver = (d: Driver) => setDrivers((prev) => [...prev, d]);
  const handleUpdateDriverCar = (driverId: string, carInfo: DriverCarInfo) =>
    setDrivers((prev) => prev.map((d) => d.id === driverId ? { ...d, carInfo, car: `${carInfo.brand} ${carInfo.model} • ${carInfo.plateNumber}` } : d));
  const handleRateDriver = (driverId: string, rating: number) => {
    if (rating === 0) return;
    setDrivers((prev) => prev.map((d) => {
      if (d.id !== driverId) return d;
      const totalRating = d.rating * d.tripsCount + rating;
      const newCount = d.tripsCount + 1;
      return { ...d, rating: Math.round((totalRating / newCount) * 10) / 10, tripsCount: newCount };
    }));
  };
  const handleDeleteDriver = (id: string) => setDrivers((prev) => prev.filter((d) => d.id !== id));
  const handleDeleteUser = (id: string) => {
    setPassengers((prev) => prev.filter((p) => p.id !== id));
    setDrivers((prev) => prev.filter((d) => d.id !== id));
  };
  const handleUpdateOrderStatus = (orderId: string, status: Order["status"]) =>
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
  const handleUpdateOrder = (orderId: string, changes: Partial<Order>) =>
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, ...changes } : o));
  const handleSendSupport = (msg: SupportMessage) => setSupportMessages((prev) => [...prev, msg]);

  const currentDriver = user?.role === "driver" ? drivers.find((d) => d.id === user.id) ?? null : null;

  if (!loaded) return null;

  return (
    <div className="app-container">
      {!user ? (
        <AuthScreen onAuth={handleAuth} drivers={drivers} settings={settings} />
      ) : user.role === "admin" ? (
        <AdminScreen
          drivers={drivers}
          orders={orders}
          settings={settings}
          passengers={passengers}
          supportMessages={supportMessages}
          onUpdateSettings={setSettings}
          onUpdateDriver={handleUpdateDriver}
          onAddDriver={handleAddDriver}
          onDeleteDriver={handleDeleteDriver}
          onDeleteUser={handleDeleteUser}
          onLogout={handleLogout}
          onCancelOrder={handleOrderCancel}
          onUpdateOrder={handleUpdateOrder}
          onSendSupport={handleSendSupport}
          onAcceptOrder={handleAcceptOrder}
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
        />
      ) : (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
          <div style={{ flex: 1, overflow: "hidden" }}>
            {tab === "profile" && <ProfileScreen user={user} onLogout={handleLogout} onSendSupport={handleSendSupport} supportMessages={supportMessages} />}
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
                <Icon name={item.icon} fallback="Circle" size={22} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}