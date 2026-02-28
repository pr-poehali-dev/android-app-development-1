import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Driver, Order, AppSettings } from "./types";

interface Props {
  drivers: Driver[];
  orders: Order[];
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
  onUpdateDriver: (id: string, changes: Partial<Driver>) => void;
  onDeleteDriver: (id: string) => void;
  onLogout: () => void;
}

type AdminTab = "dashboard" | "settings" | "drivers";

export default function AdminScreen({ drivers, orders, settings, onUpdateSettings, onUpdateDriver, onDeleteDriver, onLogout }: Props) {
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [localSettings, setLocalSettings] = useState<AppSettings>({ ...settings });
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleSaveSettings = () => {
    onUpdateSettings(localSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const activeDrivers = drivers.filter((d) => d.status === "active").length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const totalRevenue = orders.filter((o) => o.status === "done").reduce((s, o) => s + (o.price || 0), 0);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--taxi-dark)" }}>
      {/* Header */}
      <div style={{ padding: "20px 24px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 22, color: "#F0F2F5", marginBottom: 2 }}>
              Администратор
            </h1>
            <div style={{ fontSize: 12, color: "var(--taxi-muted)" }}>Панель управления TAXIGO</div>
          </div>
          <button onClick={onLogout}
            style={{ padding: "8px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, color: "var(--taxi-red)", fontSize: 13, cursor: "pointer", fontFamily: "Golos Text", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="LogOut" size={14} color="var(--taxi-red)" fallback="LogOut" /> Выйти
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: "var(--taxi-surface)", borderRadius: 14, padding: 4, marginBottom: 16 }}>
          {([
            { id: "dashboard", label: "📊 Обзор" },
            { id: "drivers", label: "🚗 Водители" },
            { id: "settings", label: "⚙️ Тарифы" },
          ] as { id: AdminTab; label: string }[]).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex: 1, padding: "9px 4px", background: tab === t.id ? "var(--taxi-yellow)" : "transparent", border: "none", borderRadius: 10, color: tab === t.id ? "var(--taxi-dark)" : "var(--taxi-muted)", fontFamily: "Montserrat", fontWeight: 700, fontSize: 11, cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 24px", paddingBottom: 24 }}>
        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <div className="animate-fade-slide-up">
            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                { label: "Водителей онлайн", value: activeDrivers, icon: "🚗", color: "var(--taxi-green)" },
                { label: "Ожидают заказа", value: pendingOrders, icon: "⏳", color: "var(--taxi-yellow)" },
                { label: "Всего водителей", value: drivers.length, icon: "👥", color: "#60A5FA" },
                { label: "Выручка", value: `${totalRevenue} ₽`, icon: "💰", color: "var(--taxi-yellow)" },
              ].map((s) => (
                <div key={s.label} className="taxi-card" style={{ textAlign: "center", padding: "14px 10px" }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 20, color: s.color, marginBottom: 2 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "var(--taxi-muted)", lineHeight: 1.3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Current orders */}
            <div style={{ fontSize: 11, color: "var(--taxi-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Активные заказы</div>
            {orders.filter((o) => o.status === "pending" || o.status === "assigned").length === 0 ? (
              <div className="taxi-card" style={{ textAlign: "center", padding: "20px", color: "var(--taxi-muted)", fontSize: 13 }}>Нет активных заказов</div>
            ) : (
              orders.filter((o) => o.status === "pending" || o.status === "assigned").map((order, idx) => (
                <div key={order.id} className="taxi-card animate-fade-slide-up" style={{ marginBottom: 8, animationDelay: `${idx * 0.06}s` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: "#F0F2F5", marginBottom: 4 }}>{order.from} → {order.to}</div>
                      <div style={{ fontSize: 11, color: "var(--taxi-muted)" }}>👤 {order.passengerName} · {order.createdAt}</div>
                      {order.driverName && <div style={{ fontSize: 11, color: "var(--taxi-green)", marginTop: 2 }}>🚗 {order.driverName}</div>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 15, color: "var(--taxi-yellow)" }}>{order.price} ₽</div>
                      <div style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: order.status === "pending" ? "rgba(255,204,0,0.15)" : "rgba(34,197,94,0.15)", color: order.status === "pending" ? "var(--taxi-yellow)" : "var(--taxi-green)" }}>
                        {order.status === "pending" ? "Ожидает" : "Назначен"}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Settings quick view */}
            <div style={{ fontSize: 11, color: "var(--taxi-muted)", textTransform: "uppercase", letterSpacing: 0.8, margin: "16px 0 10px" }}>Текущие тарифы</div>
            <div className="taxi-card">
              {[
                { label: "Стоимость за км", value: `${settings.pricePerKm} ₽` },
                { label: "Почасовой тариф", value: `${settings.pricePerHour} ₽/ч` },
                { label: "Радиус авто-назначения", value: `${settings.autoAssignRadiusKm} км` },
              ].map((row, i) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 2 ? "1px solid var(--taxi-border)" : "none" }}>
                  <span style={{ fontSize: 13, color: "var(--taxi-muted)" }}>{row.label}</span>
                  <span style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, color: "var(--taxi-yellow)" }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DRIVERS */}
        {tab === "drivers" && (
          <div className="animate-fade-slide-up">
            <div style={{ fontSize: 11, color: "var(--taxi-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>
              Все водители ({drivers.length})
            </div>
            {drivers.map((driver, idx) => (
              <div key={driver.id} className="taxi-card animate-fade-slide-up" style={{ marginBottom: 10, animationDelay: `${idx * 0.07}s` }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 44, height: 44, background: "var(--taxi-surface)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>👨</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, color: "#F0F2F5", fontWeight: 600, marginBottom: 2 }}>{driver.name}</div>
                    <div style={{ fontSize: 12, color: "var(--taxi-muted)", marginBottom: 2 }}>{driver.car}</div>
                    <div style={{ fontSize: 12, color: "var(--taxi-muted)" }}>{driver.phone}</div>
                  </div>
                  <div>
                    <div style={{
                      padding: "4px 10px", borderRadius: 16, fontSize: 11, fontWeight: 600,
                      background: driver.status === "restricted" ? "rgba(239,68,68,0.15)" : driver.status === "busy" ? "rgba(255,204,0,0.15)" : "rgba(34,197,94,0.15)",
                      color: driver.status === "restricted" ? "var(--taxi-red)" : driver.status === "busy" ? "var(--taxi-yellow)" : "var(--taxi-green)",
                    }}>
                      {driver.status === "restricted" ? "Ограничен" : driver.status === "busy" ? "Занят" : "Активен"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-yellow)" }}>★ {driver.rating}</span>
                  <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-muted)" }}>🚗 {driver.tripsCount} поездок</span>
                  <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-muted)" }}>📍 {driver.distanceKm} км</span>
                </div>

                {confirmDelete === driver.id ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { onDeleteDriver(driver.id); setConfirmDelete(null); }}
                      style={{ flex: 1, padding: "10px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 12, color: "var(--taxi-red)", fontFamily: "Golos Text", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                      Удалить ✓
                    </button>
                    <button onClick={() => setConfirmDelete(null)}
                      style={{ flex: 1, padding: "10px", background: "var(--taxi-surface)", border: "1px solid var(--taxi-border)", borderRadius: 12, color: "#F0F2F5", fontFamily: "Golos Text", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                      Отмена
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => onUpdateDriver(driver.id, { status: driver.status === "restricted" ? "active" : "restricted" })}
                      style={{ flex: 1, padding: "10px", background: driver.status === "restricted" ? "rgba(34,197,94,0.15)" : "rgba(255,204,0,0.1)", border: `1px solid ${driver.status === "restricted" ? "rgba(34,197,94,0.3)" : "rgba(255,204,0,0.3)"}`, borderRadius: 12, color: driver.status === "restricted" ? "var(--taxi-green)" : "var(--taxi-yellow)", fontFamily: "Golos Text", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <Icon name={driver.status === "restricted" ? "Unlock" : "Lock"} size={14} color={driver.status === "restricted" ? "var(--taxi-green)" : "var(--taxi-yellow)"} fallback="Lock" />
                      {driver.status === "restricted" ? "Разблокировать" : "Ограничить"}
                    </button>
                    <button onClick={() => setConfirmDelete(driver.id)}
                      style={{ width: 44, padding: "10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <Icon name="Trash2" size={16} color="var(--taxi-red)" fallback="Trash" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* SETTINGS */}
        {tab === "settings" && (
          <div className="animate-fade-slide-up">
            <div style={{ fontSize: 11, color: "var(--taxi-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }}>
              Настройки тарифов
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Price per km */}
              <div className="taxi-card">
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 38, height: 38, background: "rgba(255,204,0,0.15)", borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📍</div>
                  <div>
                    <div style={{ fontSize: 14, color: "#F0F2F5", fontWeight: 600 }}>Стоимость за км</div>
                    <div style={{ fontSize: 11, color: "var(--taxi-muted)" }}>Базовая цена за километр</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <input type="range" min={10} max={100} step={1} value={localSettings.pricePerKm}
                    onChange={(e) => setLocalSettings({ ...localSettings, pricePerKm: Number(e.target.value) })}
                    style={{ flex: 1, accentColor: "var(--taxi-yellow)" }} />
                  <div style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 20, color: "var(--taxi-yellow)", minWidth: 70, textAlign: "right" }}>
                    {localSettings.pricePerKm} ₽
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--taxi-muted)", marginTop: 4 }}>
                  <span>10 ₽</span><span>100 ₽</span>
                </div>
              </div>

              {/* Price per hour */}
              <div className="taxi-card">
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 38, height: 38, background: "rgba(255,204,0,0.15)", borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⏱️</div>
                  <div>
                    <div style={{ fontSize: 14, color: "#F0F2F5", fontWeight: 600 }}>Почасовой тариф</div>
                    <div style={{ fontSize: 11, color: "var(--taxi-muted)" }}>Стоимость за час аренды</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <input type="range" min={200} max={2000} step={50} value={localSettings.pricePerHour}
                    onChange={(e) => setLocalSettings({ ...localSettings, pricePerHour: Number(e.target.value) })}
                    style={{ flex: 1, accentColor: "var(--taxi-yellow)" }} />
                  <div style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 20, color: "var(--taxi-yellow)", minWidth: 80, textAlign: "right" }}>
                    {localSettings.pricePerHour} ₽
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--taxi-muted)", marginTop: 4 }}>
                  <span>200 ₽</span><span>2000 ₽</span>
                </div>
              </div>

              {/* Auto-assign radius */}
              <div className="taxi-card">
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 38, height: 38, background: "rgba(255,204,0,0.15)", borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🎯</div>
                  <div>
                    <div style={{ fontSize: 14, color: "#F0F2F5", fontWeight: 600 }}>Радиус авто-назначения</div>
                    <div style={{ fontSize: 11, color: "var(--taxi-muted)" }}>Дальность поиска водителя</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <input type="range" min={1} max={30} step={1} value={localSettings.autoAssignRadiusKm}
                    onChange={(e) => setLocalSettings({ ...localSettings, autoAssignRadiusKm: Number(e.target.value) })}
                    style={{ flex: 1, accentColor: "var(--taxi-yellow)" }} />
                  <div style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 20, color: "var(--taxi-yellow)", minWidth: 60, textAlign: "right" }}>
                    {localSettings.autoAssignRadiusKm} км
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--taxi-muted)", marginTop: 4 }}>
                  <span>1 км</span><span>30 км</span>
                </div>
              </div>

              {/* Preview */}
              <div className="taxi-card" style={{ background: "rgba(255,204,0,0.05)", border: "1px solid rgba(255,204,0,0.2)" }}>
                <div style={{ fontSize: 12, color: "var(--taxi-yellow)", marginBottom: 10, fontWeight: 600 }}>📊 Примерный расчёт поездки 10 км</div>
                {[
                  { name: "Эконом", price: Math.round(10 * localSettings.pricePerKm) },
                  { name: "Комфорт", price: Math.round(10 * localSettings.pricePerKm + 8) },
                  { name: "Бизнес", price: Math.round(10 * localSettings.pricePerKm + 18) },
                  { name: "Почасовой", price: localSettings.pricePerHour },
                ].map((t) => (
                  <div key={t.name} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--taxi-border)" }}>
                    <span style={{ fontSize: 13, color: "var(--taxi-muted)" }}>{t.name}</span>
                    <span style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 13, color: "#F0F2F5" }}>{t.price} ₽{t.name === "Почасовой" ? "/ч" : ""}</span>
                  </div>
                ))}
              </div>

              <button className="btn-yellow" onClick={handleSaveSettings}>
                {saved ? "✓ Сохранено!" : "Сохранить настройки"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
