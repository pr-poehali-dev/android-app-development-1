import Icon from "@/components/ui/icon";

const TRIPS = [
  {
    id: 1,
    from: "Ленина, 12",
    to: "Аэропорт Домодедово",
    date: "Сегодня, 14:32",
    price: "849 ₽",
    status: "done",
    tariff: "Комфорт",
    driver: "Алексей К.",
    rating: 5,
    km: "28 км",
  },
  {
    id: 2,
    from: "Пушкинская, 5",
    to: "ТЦ Мега Химки",
    date: "Вчера, 09:15",
    price: "342 ₽",
    status: "done",
    tariff: "Эконом",
    driver: "Иван М.",
    rating: 4,
    km: "14 км",
  },
  {
    id: 3,
    from: "Садовая, 88",
    to: "БЦ Москва-Сити",
    date: "23 февраля, 18:40",
    price: "520 ₽",
    status: "cancelled",
    tariff: "Комфорт",
    driver: null,
    rating: null,
    km: "—",
  },
  {
    id: 4,
    from: "Проспект Мира, 1",
    to: "ВДНХ, павильон 75",
    date: "21 февраля, 11:20",
    price: "198 ₽",
    status: "done",
    tariff: "Эконом",
    driver: "Дмитрий Р.",
    rating: 5,
    km: "7 км",
  },
  {
    id: 5,
    from: "Тверская, 13",
    to: "Красная Площадь",
    date: "18 февраля, 22:10",
    price: "149 ₽",
    status: "done",
    tariff: "Эконом",
    driver: "Михаил С.",
    rating: 4,
    km: "3 км",
  },
];

export default function HistoryScreen() {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--taxi-dark)" }}>
      {/* Header */}
      <div style={{ padding: "20px 24px 0" }}>
        <h1
          style={{
            fontFamily: "Montserrat",
            fontWeight: 800,
            fontSize: 24,
            color: "#F0F2F5",
            marginBottom: 4,
          }}
        >
          История поездок
        </h1>
        <p style={{ fontSize: 13, color: "var(--taxi-muted)" }}>Все ваши поездки</p>

        {/* Stats */}
        <div style={{ display: "flex", gap: 10, marginTop: 16, marginBottom: 8 }}>
          {[
            { label: "Поездок", value: "47" },
            { label: "Потрачено", value: "12 480 ₽" },
            { label: "Рейтинг", value: "4.9 ★" },
          ].map((s) => (
            <div
              key={s.label}
              className="taxi-card"
              style={{ flex: 1, textAlign: "center", padding: "12px 8px" }}
            >
              <div
                style={{
                  fontFamily: "Montserrat",
                  fontWeight: 700,
                  fontSize: 16,
                  color: "var(--taxi-yellow)",
                  marginBottom: 2,
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: 11, color: "var(--taxi-muted)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 24px", paddingBottom: 88 }}>
        {TRIPS.map((trip, idx) => (
          <div
            key={trip.id}
            className="taxi-card animate-fade-slide-up"
            style={{
              marginBottom: 10,
              animationDelay: `${idx * 0.07}s`,
              cursor: "pointer",
              transition: "border-color 0.2s",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                {/* Route */}
                <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 3 }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        background: "var(--taxi-green)",
                        borderRadius: "50%",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ width: 1, flex: 1, background: "var(--taxi-border)", margin: "3px 0" }} />
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        background:
                          trip.status === "cancelled" ? "var(--taxi-red)" : "var(--taxi-yellow)",
                        borderRadius: 2,
                        flexShrink: 0,
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "#F0F2F5", marginBottom: 6 }}>{trip.from}</div>
                    <div style={{ fontSize: 13, color: "var(--taxi-muted)" }}>{trip.to}</div>
                  </div>
                </div>

                {/* Meta */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--taxi-muted)",
                      background: "var(--taxi-surface)",
                      padding: "3px 8px",
                      borderRadius: 6,
                    }}
                  >
                    {trip.date}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--taxi-muted)",
                      background: "var(--taxi-surface)",
                      padding: "3px 8px",
                      borderRadius: 6,
                    }}
                  >
                    {trip.tariff}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--taxi-muted)",
                      background: "var(--taxi-surface)",
                      padding: "3px 8px",
                      borderRadius: 6,
                    }}
                  >
                    {trip.km}
                  </span>
                </div>
              </div>

              {/* Right side */}
              <div style={{ textAlign: "right", marginLeft: 12 }}>
                <div
                  style={{
                    fontFamily: "Montserrat",
                    fontWeight: 700,
                    fontSize: 16,
                    color: trip.status === "cancelled" ? "var(--taxi-red)" : "#F0F2F5",
                    marginBottom: 4,
                  }}
                >
                  {trip.status === "cancelled" ? "Отменено" : trip.price}
                </div>
                {trip.rating && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--taxi-yellow)",
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      justifyContent: "flex-end",
                    }}
                  >
                    {"★".repeat(trip.rating)}
                    {"☆".repeat(5 - trip.rating)}
                  </div>
                )}
                <button
                  style={{
                    marginTop: 6,
                    background: "transparent",
                    border: "none",
                    color: "var(--taxi-yellow)",
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "Golos Text",
                    padding: 0,
                  }}
                >
                  Повторить →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
