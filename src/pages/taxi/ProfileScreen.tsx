import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { User, SupportMessage, LOGO_URL } from "./types";
import { playNotificationSound } from "./notifications";

interface Props {
  user: User;
  onLogout: () => void;
  onSendSupport: (msg: SupportMessage) => void;
  supportMessages: SupportMessage[];
}

export default function ProfileScreen({ user, onLogout, onSendSupport, supportMessages }: Props) {
  const [supportOpen, setSupportOpen] = useState(false);
  const [input, setInput] = useState("");
  const prevCountRef = useRef(supportMessages.length);

  const myMessages = supportMessages.filter(
    (m) => m.fromId === user.id || (m.fromRole === "admin" && m.fromId === user.id)
  );

  useEffect(() => {
    if (supportMessages.length > prevCountRef.current) {
      const lastMsg = supportMessages[supportMessages.length - 1];
      if (lastMsg.fromRole === "admin" && lastMsg.fromId === user.id) {
        playNotificationSound("message");
      }
    }
    prevCountRef.current = supportMessages.length;
  }, [supportMessages, user.id]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const msg: SupportMessage = {
      id: `sm_${Date.now()}`,
      fromId: user.id,
      fromName: user.name,
      fromRole: "passenger",
      text: input.trim(),
      time: new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
      timestamp: Date.now(),
      read: false,
    };
    onSendSupport(msg);
    setInput("");
  };

  if (supportOpen) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--taxi-dark)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--taxi-border)", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setSupportOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--taxi-yellow)" }}>
            <Icon name="ArrowLeft" size={20} />
          </button>
          <div style={{ width: 36, height: 36, background: "var(--taxi-yellow)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src={LOGO_URL} alt="" style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover" }} />
          </div>
          <div>
            <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, color: "#F0F2F5" }}>Поддержка</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div className="animate-blink" style={{ width: 6, height: 6, background: "var(--taxi-green)", borderRadius: "50%" }} />
              <span style={{ fontSize: 11, color: "var(--taxi-green)" }}>Онлайн</span>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          {myMessages.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--taxi-muted)", fontSize: 13, marginTop: 40 }}>Напишите в поддержку</div>
          )}
          {myMessages.map((msg) => (
            <div key={msg.id} style={{ display: "flex", justifyContent: msg.fromRole === "passenger" ? "flex-end" : "flex-start" }}>
              {msg.fromRole === "admin" && (
                <div style={{ width: 28, height: 28, marginRight: 8, flexShrink: 0, alignSelf: "flex-end" }}>
                  <img src={LOGO_URL} alt="" style={{ width: 28, height: 28, borderRadius: 8, objectFit: "cover" }} />
                </div>
              )}
              <div style={{
                maxWidth: "75%", padding: "10px 14px",
                borderRadius: msg.fromRole === "passenger" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: msg.fromRole === "passenger" ? "var(--taxi-yellow)" : "var(--taxi-card)",
                border: msg.fromRole === "passenger" ? "none" : "1px solid var(--taxi-border)",
              }}>
                <p style={{ fontSize: 14, color: msg.fromRole === "passenger" ? "var(--taxi-dark)" : "#F0F2F5", lineHeight: 1.5, margin: 0 }}>{msg.text}</p>
                <p style={{ fontSize: 10, color: msg.fromRole === "passenger" ? "rgba(13,15,20,0.5)" : "var(--taxi-muted)", margin: "4px 0 0" }}>{msg.time}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: "12px 20px", paddingBottom: 80, borderTop: "1px solid var(--taxi-border)", display: "flex", gap: 10 }}>
          <input className="taxi-input" placeholder="Напишите сообщение..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} style={{ flex: 1 }} />
          <button onClick={sendMessage} style={{ width: 50, height: 50, background: "var(--taxi-yellow)", border: "none", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <Icon name="Send" size={20} color="var(--taxi-dark)" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--taxi-dark)" }}>
      <div style={{ padding: "24px 24px 28px", background: "linear-gradient(180deg, var(--taxi-card) 0%, var(--taxi-dark) 100%)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{ position: "relative" }}>
            <div style={{ width: 90, height: 90, background: "var(--taxi-yellow)", borderRadius: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42 }}>
              {user.avatar ? (
                <img src={user.avatar} alt="" style={{ width: 90, height: 90, borderRadius: 28, objectFit: "cover" }} />
              ) : (
                <Icon name="User" size={42} color="var(--taxi-dark)" />
              )}
            </div>
            <div style={{ position: "absolute", bottom: -2, right: -2, width: 22, height: 22, background: "var(--taxi-green)", borderRadius: "50%", border: "2px solid var(--taxi-dark)" }} />
          </div>

          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 22, color: "#F0F2F5", marginBottom: 4 }}>
              {user.name}
            </h2>
            <p style={{ fontSize: 14, color: "var(--taxi-muted)" }}>{user.phone}</p>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: "0 24px", paddingBottom: 80 }}>
        <button
          onClick={() => setSupportOpen(true)}
          className="animate-fade-slide-up"
          style={{
            width: "100%", padding: "16px 20px", background: "var(--taxi-surface)",
            border: "1px solid var(--taxi-border)", borderRadius: 18, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 14, marginBottom: 16, transition: "border-color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--taxi-yellow)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--taxi-border)")}
        >
          <div style={{ width: 48, height: 48, background: "rgba(255,204,0,0.15)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="MessageCircle" size={22} color="var(--taxi-yellow)" />
          </div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 15, color: "#F0F2F5" }}>Поддержка</div>
            <div style={{ fontSize: 12, color: "var(--taxi-muted)", marginTop: 2 }}>Чат с администратором</div>
          </div>
          <Icon name="ChevronRight" size={18} color="var(--taxi-muted)" />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 0", marginBottom: 8 }}>
          <Icon name="ShieldCheck" size={16} color="var(--taxi-green)" />
          <span style={{ fontSize: 12, color: "var(--taxi-muted)" }}>End-to-end шифрование активно</span>
        </div>

        <button
          onClick={onLogout}
          style={{
            width: "100%", marginTop: 12, padding: "14px",
            background: "transparent", border: "1px solid var(--taxi-border)",
            borderRadius: 14, color: "var(--taxi-red)", fontFamily: "Montserrat",
            fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center", gap: 8, transition: "border-color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--taxi-red)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--taxi-border)")}
        >
          <Icon name="LogOut" size={18} color="var(--taxi-red)" /> Выйти
        </button>
      </div>
    </div>
  );
}
