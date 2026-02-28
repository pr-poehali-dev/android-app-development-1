import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Order, Driver, AppSettings } from "./types";

interface Props {
  driver: Driver;
  orders: Order[];
  settings: AppSettings;
  onAcceptOrder: (orderId: string, driverId: string, driverName: string) => void;
  onToggleAutoAssign: (driverId: string) => void;
}

type DriverTab = "active" | "free";

export default function DriverScreen({ driver, orders, settings, onAcceptOrder, onToggleAutoAssign }: Props) {
  const [tab, setTab] = useState<DriverTab>("active");

  const myOrder = orders.find((o) => o.driverId === driver.id && o.status !== "done" && o.status !== "cancelled");
  const freeOrders = orders.filter((o) => o.status === "pending");
  const isRestricted = driver.status === "restricted";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--taxi-dark)" }}>
      {/* Header */}
      <div style={{ padding: "20px 24px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 22, color: "#F0F2F5", marginBottom: 2 }}>
              Панель водителя
            </h1>
            <div style={{ fontSize: 13, color: "var(--taxi-muted)" }}>{driver.car}</div>
          </div>

          {/* Status badge */}
          <div style={{
            padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: "Montserrat",
            background: isRestricted ? "rgba(239,68,68,0.15)" : driver.status === "busy" ? "rgba(255,204,0,0.15)" : "rgba(34,197,94,0.15)",
            color: isRestricted ? "var(--taxi-red)" : driver.status === "busy" ? "var(--taxi-yellow)" : "var(--taxi-green)",
            border: `1px solid ${isRestricted ? "rgba(239,68,68,0.3)" : driver.status === "busy" ? "rgba(255,204,0,0.3)" : "rgba(34,197,94,0.3)"}`,
          }}>
            {isRestricted ? "🚫 Ограничен" : driver.status === "busy" ? "🟡 Занят" : "🟢 Свободен"}
          </div>
        </div>

        {isRestricted && (
          <div style={{ padding: "12px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 14, marginBottom: 14, fontSize: 13, color: "var(--taxi-red)", lineHeight: 1.5 }}>
            ⚠️ Ваш аккаунт ограничен администратором. Вы не можете принимать заказы. Обратитесь в поддержку.
          </div>
        )}

        {/* Auto-assign toggle */}
        <div className="taxi-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, background: driver.autoAssign ? "rgba(255,204,0,0.15)" : "var(--taxi-surface)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }}>
              <Icon name="Zap" size={20} color={driver.autoAssign ? "var(--taxi-yellow)" : "var(--taxi-muted)"} fallback="Settings" />
            </div>
            <div>
              <div style={{ fontSize: 14, color: "#F0F2F5", fontWeight: 500 }}>Авто-назначение</div>
              <div style={{ fontSize: 11, color: "var(--taxi-muted)", marginTop: 1 }}>
                Заказы в радиусе {settings.autoAssignRadiusKm} км • Вы в {driver.distanceKm} км
              </div>
            </div>
          </div>
          <div onClick={() => !isRestricted && onToggleAutoAssign(driver.id)}
            style={{ width: 48, height: 28, background: driver.autoAssign && !isRestricted ? "var(--taxi-yellow)" : "var(--taxi-surface)", borderRadius: 14, position: "relative", cursor: isRestricted ? "not-allowed" : "pointer", transition: "background 0.2s", border: `1px solid ${driver.autoAssign && !isRestricted ? "var(--taxi-yellow)" : "var(--taxi-border)"}`, opacity: isRestricted ? 0.5 : 1, flexShrink: 0 }}>
            <div style={{ position: "absolute", width: 22, height: 22, background: driver.autoAssign && !isRestricted ? "var(--taxi-dark)" : "#F0F2F5", borderRadius: "50%", top: 2, left: driver.autoAssign && !isRestricted ? 23 : 2, transition: "left 0.2s" }} />
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: "var(--taxi-surface)", borderRadius: 14, padding: 4, marginBottom: 14 }}>
          {(["active", "free"] as DriverTab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: "10px", background: tab === t ? "var(--taxi-yellow)" : "transparent", border: "none", borderRadius: 10, color: tab === t ? "var(--taxi-dark)" : "var(--taxi-muted)", fontFamily: "Montserrat", fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.2s" }}>
              {t === "active" ? `🚗 Мой заказ` : `📋 Свободные (${freeOrders.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 24px", paddingBottom: 88 }}>
        {tab === "active" ? (
          <>
            {myOrder ? (
              <ActiveOrderCard order={myOrder} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 40, gap: 12, textAlign: "center" }}>
                <div style={{ fontSize: 48 }}>🕐</div>
                <div style={{ fontFamily: "Montserrat", fontWeight: 600, fontSize: 16, color: "#F0F2F5" }}>Нет активного заказа</div>
                <div style={{ fontSize: 13, color: "var(--taxi-muted)", lineHeight: 1.5 }}>
                  {driver.autoAssign ? "Автоназначение включено. Ожидайте заказ в вашем районе." : "Включите автоназначение или выберите заказ из списка свободных."}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {freeOrders.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 40, gap: 12, textAlign: "center" }}>
                <div style={{ fontSize: 48 }}>✅</div>
                <div style={{ fontFamily: "Montserrat", fontWeight: 600, fontSize: 16, color: "#F0F2F5" }}>Все заказы разобраны</div>
                <div style={{ fontSize: 13, color: "var(--taxi-muted)" }}>Новые заказы появятся здесь</div>
              </div>
            ) : (
              freeOrders.map((order, idx) => (
                <FreeOrderCard key={order.id} order={order} idx={idx}
                  onAccept={() => !isRestricted && onAcceptOrder(order.id, driver.id, driver.name)}
                  disabled={isRestricted || !!myOrder} />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ActiveOrderCard({ order }: { order: Order }) {
  return (
    <div className="animate-fade-slide-up">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span className="animate-blink" style={{ color: "var(--taxi-green)", fontSize: 10 }}>●</span>
        <span style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 15, color: "var(--taxi-green)" }}>
          {order.status === "assigned" ? "Едете к пассажиру" : "В пути"}
        </span>
      </div>

      <div className="taxi-card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 3 }}>
            <div style={{ width: 9, height: 9, background: "var(--taxi-green)", borderRadius: "50%" }} />
            <div style={{ width: 1, flex: 1, background: "var(--taxi-border)", margin: "4px 0" }} />
            <div style={{ width: 9, height: 9, background: "var(--taxi-yellow)", borderRadius: 2 }} />
          </div>
          <div>
            <div style={{ fontSize: 14, color: "#F0F2F5", marginBottom: 8 }}>{order.from}</div>
            <div style={{ fontSize: 14, color: "var(--taxi-muted)" }}>{order.to}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-muted)" }}>👤 {order.passengerName}</span>
          {order.options.children && <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-yellow)" }}>👶 Дети: {order.options.childrenCount}</span>}
          {order.options.luggage && <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-yellow)" }}>🧳 Багаж</span>}
          <span style={{ fontSize: 11, padding: "3px 8px", background: "rgba(255,204,0,0.15)", borderRadius: 6, color: "var(--taxi-yellow)", fontWeight: 600 }}>{order.price} ₽</span>
        </div>

        {order.options.comment && (
          <div style={{ marginTop: 10, padding: "8px 10px", background: "var(--taxi-surface)", borderRadius: 10, fontSize: 12, color: "var(--taxi-muted)", fontStyle: "italic" }}>
            💬 {order.options.comment}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ flex: 1, padding: "13px", background: "var(--taxi-yellow)", border: "none", borderRadius: 14, color: "var(--taxi-dark)", fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          📞 Позвонить
        </button>
        <button style={{ flex: 1, padding: "13px", background: "var(--taxi-surface)", border: "1px solid var(--taxi-border)", borderRadius: 14, color: "var(--taxi-green)", fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          ✓ Завершить
        </button>
      </div>
    </div>
  );
}

function FreeOrderCard({ order, idx, onAccept, disabled }: { order: Order; idx: number; onAccept: () => void; disabled: boolean }) {
  return (
    <div className="taxi-card animate-fade-slide-up" style={{ marginBottom: 10, animationDelay: `${idx * 0.07}s` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
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
        <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 18, color: "var(--taxi-yellow)" }}>{order.price} ₽</div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-muted)" }}>{order.createdAt}</span>
        {order.options.children && <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-yellow)" }}>👶 Дети: {order.options.childrenCount}</span>}
        {order.options.luggage && <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--taxi-surface)", borderRadius: 6, color: "var(--taxi-yellow)" }}>🧳 Багаж</span>}
      </div>

      {order.options.comment && (
        <div style={{ padding: "7px 10px", background: "var(--taxi-surface)", borderRadius: 10, fontSize: 12, color: "var(--taxi-muted)", marginBottom: 10, fontStyle: "italic" }}>
          💬 {order.options.comment}
        </div>
      )}

      <button onClick={onAccept} disabled={disabled}
        style={{ width: "100%", padding: "12px", background: disabled ? "var(--taxi-surface)" : "var(--taxi-yellow)", border: `1px solid ${disabled ? "var(--taxi-border)" : "var(--taxi-yellow)"}`, borderRadius: 13, color: disabled ? "var(--taxi-muted)" : "var(--taxi-dark)", fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
        {disabled ? "Недоступно" : "Принять заказ →"}
      </button>
    </div>
  );
}
