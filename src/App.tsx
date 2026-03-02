import { useState } from "react";
import AuthScreen from "./pages/taxi/AuthScreen";
import PassengerOrderScreen from "./pages/taxi/PassengerOrderScreen";
import HistoryScreen from "./pages/taxi/HistoryScreen";
import ProfileScreen from "./pages/taxi/ProfileScreen";
import DriverScreen from "./pages/taxi/DriverScreen";
import AdminScreen from "./pages/taxi/AdminScreen";
import Icon from "@/components/ui/icon";
import {
  User, Order, Driver, AppSettings, DriverCarInfo,
  INITIAL_DRIVERS, INITIAL_ORDERS, INITIAL_SETTINGS,
} from "./pages/taxi/types";

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

  const handleAuth = (u: User) => setUser(u);
  const handleLogout = () => { setUser(null); setTab("order"); };

  const handleRepeat = (from: string, to: string) => {
    setRepeatFrom(from);
    setRepeatTo(to);
    setTab("order");
  };

  const handleOrderCreate = (order: Order) => setOrders((prev) => [...prev, order]);
  const handleOrderCancel = (id: string) =>
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "cancelled" } : o));
  const handleAcceptOrder = (orderId: string, driverId: string, driverName: string, eta?: number) =>
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: "assigned", driverId, driverName, etaMinutes: eta } : o));
  const handleToggleAutoAssign = (driverId: string) =>
    setDrivers((prev) => prev.map((d) => d.id === driverId ? { ...d, autoAssign: !d.autoAssign } : d));
  const handleUpdateDriver = (id: string, changes: Partial<Driver>) =>
    setDrivers((prev) => prev.map((d) => d.id === id ? { ...d, ...changes } : d));
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
  const handleDeleteDriver = (id: string) =>
    setDrivers((prev) => prev.filter((d) => d.id !== id));

  const handleUpdateOrderStatus = (orderId: string, status: Order["status"]) =>
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));

  const currentDriver = user?.role === "driver" ? drivers.find((d) => d.id === user.id) ?? drivers[0] : null;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #060810 0%, #0D0F14 50%, #060810 100%)" }}
    >
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full"
          style={{ background: "radial-gradient(circle, #FFCC00 0%, transparent 70%)", filter: "blur(80px)", opacity: 0.06 }} />
      </div>

      <div className="phone-frame relative">
        <div className="status-bar">
          <span style={{ fontFamily: "Montserrat", fontWeight: 600, fontSize: 14, color: "#F0F2F5" }}>9:41</span>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5 items-end">
              {[3, 5, 7, 9].map((h, i) => (
                <div key={i} className="w-1 rounded-sm" style={{ height: h, background: i < 3 ? "#F0F2F5" : "#3A4155" }} />
              ))}
            </div>
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
              <path d="M8 2.4C10.5 2.4 12.7 3.4 14.3 5L16 3.3C13.9 1.3 11.1 0 8 0C4.9 0 2.1 1.3 0 3.3L1.7 5C3.3 3.4 5.5 2.4 8 2.4Z" fill="#F0F2F5" />
              <path d="M8 5.6C9.7 5.6 11.2 6.3 12.3 7.4L14 5.7C12.4 4.1 10.3 3.2 8 3.2C5.7 3.2 3.6 4.1 2 5.7L3.7 7.4C4.8 6.3 6.3 5.6 8 5.6Z" fill="#F0F2F5" />
              <circle cx="8" cy="10" r="2" fill="#F0F2F5" />
            </svg>
            <div className="rounded-sm flex items-center" style={{ width: 24, height: 12, background: "#3A4155", border: "1px solid #5A6478", padding: "1px" }}>
              <div className="h-full rounded-sm" style={{ width: "75%", background: "#F0F2F5" }} />
            </div>
          </div>
        </div>

        <div style={{ height: "calc(844px - 44px)", overflow: "hidden", position: "relative" }}>
          {!user ? (
            <AuthScreen onAuth={handleAuth} drivers={drivers} />

          ) : user.role === "admin" ? (
            <div style={{ height: "100%", overflowY: "auto" }}>
              <AdminScreen
                drivers={drivers}
                orders={orders}
                settings={settings}
                onUpdateSettings={setSettings}
                onUpdateDriver={handleUpdateDriver}
                onDeleteDriver={handleDeleteDriver}
                onLogout={handleLogout}
              />
            </div>

          ) : user.role === "driver" && currentDriver ? (
            <div style={{ height: "100%", overflowY: "auto" }}>
              <DriverScreen
                driver={currentDriver}
                orders={orders}
                settings={settings}
                onAcceptOrder={handleAcceptOrder}
                onToggleAutoAssign={handleToggleAutoAssign}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                onUpdateDriverCar={handleUpdateDriverCar}
                onLogout={handleLogout}
              />
            </div>

          ) : (
            <>
              {tab === "profile" && <ProfileScreen user={user} onLogout={handleLogout} />}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}