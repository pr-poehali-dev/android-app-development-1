import Icon from "@/components/ui/icon";
import { Order } from "./types";

const TARIFF_LABEL: Record<string, string> = {
  economy: "Эконом",
  comfort: "Комфорт",
  business: "Бизнес",
  hourly: "Почасовой",
};

interface Props {
  orders: Order[];
  onRepeat: (from: string, to: string) => void;
}

export default function HistoryScreen({ orders, onRepeat }: Props) {
  const completed = orders.filter((o) => o.status === "done" || o.status === "cancelled");

  const stats = {
    total: completed.filter((o) => o.status === "done").length,
    spent: completed.filter((o) => o.status === "done").reduce((s, o) => s + (o.price ?? 0), 0),
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--taxi-dark)" }}>
      {/* Header */}
      <div style={{ padding: "20px 24px 0" }}>
        <h1 style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 24, color: "#F0F2F5", marginBottom: 4 }}>
          История поездок
        </h1>
        <p style={{ fontSize: 13, color: "var(--taxi-muted)" }}>Все ваши поездки</p>

        {/* Stats */}
        <div style={{ display: "flex", gap: 10, marginTop: 16, marginBottom: 8 }}>
          {[
            { label: "Поездок", value: String(stats.total || 0) },
            { label: "Потрачено", value: stats.spent ? `${stats.spent} ₽` : "0 ₽" },
            { label: "Отменено", value: String(completed.filter((o) => o.status === "cancelled").length) },
          ].map((s) => (
            <div key={s.label} className="taxi-card" style={{ flex: 1, textAlign: "center", padding: "12px 8px" }}>
              <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 16, color: "var(--taxi-yellow)", marginBottom: 2 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "var(--taxi-muted)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 24px", paddingBottom: 88 }}>
        {completed.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
            <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 16, color: "#F0F2F5", marginBottom: 6 }}>Пока нет поездок</div>
            <div style={{ fontSize: 13, color: "var(--taxi-muted)" }}>Закажите первую поездку!</div>
          </div>
        ) : (
          completed.slice().reverse().map((trip, idx) => (
            <div
              key={trip.id}
              className="taxi-card animate-fade-slide-up"
              style={{ marginBottom: 10, animationDelay: `${idx * 0.07}s` }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  {/* Route */}
                  <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 3 }}>
                      <div style={{ width: 8, height: 8, background: "var(--taxi-green)", borderRadius: "50%", flexShrink: 0 }} />
                      <div style={{ width: 1, flex: 1, background: "var(--taxi-border)", margin: "3px 0" }} />
                      <div style={{ width: 8, height: 8, background: trip.status === "cancelled" ? "var(--taxi-red)" : "var(--taxi-yellow)", borderRadius: 2, flexShrink: 0 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: "#F0F2F5", marginBottom: 6 }}>{trip.from}</div>
                      <div style={{ fontSize: 13, color: "var(--taxi-muted)" }}>{trip.to}</div>
                    </div>
                  </div>

                  {/* Meta */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "var(--taxi-muted)", background: "var(--taxi-surface)", padding: "3px 8px", borderRadius: 6 }}>{trip.createdAt}</span>
                    <span style={{ fontSize: 11, color: "var(--taxi-muted)", background: "var(--taxi-surface)", padding: "3px 8px", borderRadius: 6 }}>{TARIFF_LABEL[trip.tariff] ?? trip.tariff}</span>
                    {trip.driverName && (
                      <span style={{ fontSize: 11, color: "var(--taxi-muted)", background: "var(--taxi-surface)", padding: "3px 8px", borderRadius: 6 }}>
                        <Icon name="User" size={10} /> {trip.driverName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right */}
                <div style={{ textAlign: "right", marginLeft: 12, flexShrink: 0 }}>
                  <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 15, color: trip.status === "cancelled" ? "var(--taxi-red)" : "#F0F2F5", marginBottom: 6 }}>
                    {trip.status === "cancelled" ? "Отменено" : `${trip.price ?? 0} ₽`}
                  </div>
                  {trip.status === "done" && (
                    <button
                      onClick={() => onRepeat(trip.from, trip.to)}
                      style={{ background: "transparent", border: "1px solid var(--taxi-yellow)", borderRadius: 8, color: "var(--taxi-yellow)", fontSize: 11, cursor: "pointer", fontFamily: "Golos Text", padding: "4px 10px", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <Icon name="RotateCcw" size={11} /> Повторить
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
