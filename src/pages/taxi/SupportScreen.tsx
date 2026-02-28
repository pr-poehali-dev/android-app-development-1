import { useState } from "react";
import Icon from "@/components/ui/icon";

const FAQS = [
  { q: "Как изменить маршрут во время поездки?", a: "Сообщите водителю или нажмите кнопку 'Изменить маршрут' в активной поездке. Стоимость будет пересчитана автоматически." },
  { q: "Что делать, если я забыл вещи в машине?", a: "Перейдите в историю поездок, выберите нужную поездку и нажмите 'Связаться с водителем'. У вас есть 30 минут после завершения поездки." },
  { q: "Как оплатить поездку картой?", a: "Привяжите карту в разделе 'Способы оплаты' в профиле. Оплата произойдёт автоматически после завершения поездки." },
  { q: "Как отменить поездку?", a: "Нажмите 'Отменить поездку' в экране активного заказа. Бесплатная отмена доступна в течение 3 минут после подтверждения." },
];

const MESSAGES = [
  { from: "bot", text: "Привет! Я помогу решить любой вопрос 👋", time: "сейчас" },
  { from: "bot", text: "Выберите тему обращения или напишите свой вопрос", time: "сейчас" },
];

const QUICK_TOPICS = ["Проблема с оплатой", "Потеря вещей", "Жалоба на водителя", "Другое"];

export default function SupportScreen() {
  const [tab, setTab] = useState<"chat" | "faq">("chat");
  const [messages, setMessages] = useState(MESSAGES);
  const [input, setInput] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const sendMessage = (text?: string) => {
    const msg = text || input;
    if (!msg.trim()) return;
    setMessages((prev) => [...prev, { from: "user", text: msg, time: "сейчас" }]);
    setInput("");
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text: "Ваш запрос принят! Оператор ответит в течение 5 минут. Среднее время ответа: 2 мин.",
          time: "сейчас",
        },
      ]);
    }, 1200);
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--taxi-dark)" }}>
      {/* Header */}
      <div style={{ padding: "20px 24px 0" }}>
        <h1 style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 24, color: "#F0F2F5", marginBottom: 4 }}>
          Поддержка
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
          <div style={{ width: 8, height: 8, background: "var(--taxi-green)", borderRadius: "50%" }} className="animate-blink" />
          <span style={{ fontSize: 13, color: "var(--taxi-green)" }}>Онлайн • Ответ за 2 минуты</span>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            background: "var(--taxi-surface)",
            borderRadius: 14,
            padding: 4,
            marginBottom: 16,
          }}
        >
          {(["chat", "faq"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: "10px",
                background: tab === t ? "var(--taxi-yellow)" : "transparent",
                border: "none",
                borderRadius: 10,
                color: tab === t ? "var(--taxi-dark)" : "var(--taxi-muted)",
                fontFamily: "Montserrat",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {t === "chat" ? "💬 Чат" : "❓ FAQ"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {tab === "chat" ? (
        <>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className="animate-fade-slide-up"
                style={{
                  display: "flex",
                  justifyContent: msg.from === "user" ? "flex-end" : "flex-start",
                  animationDelay: `${idx * 0.05}s`,
                }}
              >
                {msg.from === "bot" && (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      background: "var(--taxi-yellow)",
                      borderRadius: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      marginRight: 8,
                      flexShrink: 0,
                      alignSelf: "flex-end",
                    }}
                  >
                    🤖
                  </div>
                )}
                <div
                  style={{
                    maxWidth: "75%",
                    padding: "10px 14px",
                    background:
                      msg.from === "user"
                        ? "var(--taxi-yellow)"
                        : "var(--taxi-card)",
                    borderRadius:
                      msg.from === "user"
                        ? "18px 18px 4px 18px"
                        : "18px 18px 18px 4px",
                    border: msg.from === "user" ? "none" : "1px solid var(--taxi-border)",
                  }}
                >
                  <p
                    style={{
                      fontSize: 14,
                      color: msg.from === "user" ? "var(--taxi-dark)" : "#F0F2F5",
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {msg.text}
                  </p>
                  <p
                    style={{
                      fontSize: 10,
                      color: msg.from === "user" ? "rgba(13,15,20,0.5)" : "var(--taxi-muted)",
                      margin: "4px 0 0",
                    }}
                  >
                    {msg.time}
                  </p>
                </div>
              </div>
            ))}

            {/* Quick topics */}
            {messages.length === 2 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                {QUICK_TOPICS.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => sendMessage(topic)}
                    style={{
                      padding: "8px 14px",
                      background: "var(--taxi-surface)",
                      border: "1px solid var(--taxi-border)",
                      borderRadius: 20,
                      color: "#F0F2F5",
                      fontSize: 13,
                      cursor: "pointer",
                      fontFamily: "Golos Text",
                      transition: "border-color 0.2s",
                    }}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div
            style={{
              padding: "12px 24px",
              paddingBottom: 88,
              borderTop: "1px solid var(--taxi-border)",
              display: "flex",
              gap: 10,
              background: "var(--taxi-dark)",
            }}
          >
            <input
              className="taxi-input"
              placeholder="Напишите сообщение..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              style={{ flex: 1 }}
            />
            <button
              onClick={() => sendMessage()}
              style={{
                width: 50,
                height: 50,
                background: "var(--taxi-yellow)",
                border: "none",
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <Icon name="Send" size={20} color="var(--taxi-dark)" fallback="ArrowRight" />
            </button>
          </div>
        </>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", padding: "0 24px", paddingBottom: 88 }}>
          <p style={{ fontSize: 13, color: "var(--taxi-muted)", marginBottom: 16 }}>
            Часто задаваемые вопросы
          </p>
          {FAQS.map((faq, idx) => (
            <div
              key={idx}
              className="taxi-card animate-fade-slide-up"
              style={{ marginBottom: 10, cursor: "pointer", animationDelay: `${idx * 0.08}s` }}
              onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <p style={{ fontSize: 14, color: "#F0F2F5", fontWeight: 500, margin: 0, flex: 1 }}>
                  {faq.q}
                </p>
                <Icon
                  name={openFaq === idx ? "ChevronUp" : "ChevronDown"}
                  size={18}
                  color="var(--taxi-yellow)"
                  fallback="ChevronDown"
                />
              </div>
              {openFaq === idx && (
                <p style={{ fontSize: 13, color: "var(--taxi-muted)", marginTop: 10, lineHeight: 1.6, margin: "10px 0 0" }}>
                  {faq.a}
                </p>
              )}
            </div>
          ))}

          <div className="taxi-card" style={{ marginTop: 16, textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "var(--taxi-muted)", marginBottom: 12 }}>
              Не нашли ответ? Свяжитесь с нами
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              {[{ icon: "Phone", label: "Позвонить" }, { icon: "MessageCircle", label: "Написать" }].map((btn) => (
                <button
                  key={btn.label}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "var(--taxi-surface)",
                    border: "1px solid var(--taxi-border)",
                    borderRadius: 12,
                    color: "var(--taxi-yellow)",
                    fontFamily: "Golos Text",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <Icon name={btn.icon} size={16} color="var(--taxi-yellow)" fallback="Phone" />
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
