import { useState } from "react";
import AuthScreen from "./pages/taxi/AuthScreen";
import OrderScreen from "./pages/taxi/OrderScreen";
import HistoryScreen from "./pages/taxi/HistoryScreen";
import ProfileScreen from "./pages/taxi/ProfileScreen";
import SupportScreen from "./pages/taxi/SupportScreen";
import Icon from "@/components/ui/icon";

type Screen = "auth" | "order" | "history" | "profile" | "support";

const NAV_ITEMS = [
  { id: "order", label: "Поездка", icon: "Car" },
  { id: "history", label: "История", icon: "Clock" },
  { id: "profile", label: "Профиль", icon: "User" },
  { id: "support", label: "Помощь", icon: "MessageCircle" },
] as const;

export default function App() {
  const [screen, setScreen] = useState<Screen>("auth");
  const [isAuthed, setIsAuthed] = useState(false);

  const handleAuth = () => {
    setIsAuthed(true);
    setScreen("order");
  };

  const navigate = (s: Screen) => setScreen(s);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "linear-gradient(135deg, #060810 0%, #0D0F14 50%, #060810 100%)" }}
    >
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-8"
          style={{
            background: "radial-gradient(circle, #FFCC00 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      <div className="phone-frame relative">
        {/* Status Bar */}
        <div className="status-bar">
          <span style={{ fontFamily: "Montserrat", fontWeight: 600, fontSize: 14, color: "#F0F2F5" }}>
            9:41
          </span>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5 items-end">
              {[3, 5, 7, 9].map((h, i) => (
                <div
                  key={i}
                  className="w-1 rounded-sm"
                  style={{ height: h, background: i < 3 ? "#F0F2F5" : "#3A4155" }}
                />
              ))}
            </div>
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
              <path
                d="M8 2.4C10.5 2.4 12.7 3.4 14.3 5L16 3.3C13.9 1.3 11.1 0 8 0C4.9 0 2.1 1.3 0 3.3L1.7 5C3.3 3.4 5.5 2.4 8 2.4Z"
                fill="#F0F2F5"
              />
              <path
                d="M8 5.6C9.7 5.6 11.2 6.3 12.3 7.4L14 5.7C12.4 4.1 10.3 3.2 8 3.2C5.7 3.2 3.6 4.1 2 5.7L3.7 7.4C4.8 6.3 6.3 5.6 8 5.6Z"
                fill="#F0F2F5"
              />
              <circle cx="8" cy="10" r="2" fill="#F0F2F5" />
            </svg>
            <div
              className="rounded-sm flex items-center"
              style={{ width: 24, height: 12, background: "#3A4155", border: "1px solid #5A6478", padding: "1px" }}
            >
              <div className="h-full rounded-sm" style={{ width: "75%", background: "#F0F2F5" }} />
            </div>
          </div>
        </div>

        {/* Screen content */}
        <div style={{ height: "calc(844px - 44px)", overflow: "hidden", position: "relative" }}>
          {!isAuthed ? (
            <AuthScreen onAuth={handleAuth} />
          ) : (
            <>
              {screen === "order" && <OrderScreen />}
              {screen === "history" && <HistoryScreen />}
              {screen === "profile" && (
                <ProfileScreen
                  onLogout={() => {
                    setIsAuthed(false);
                    setScreen("auth");
                  }}
                />
              )}
              {screen === "support" && <SupportScreen />}

              {/* Bottom Nav */}
              <div className="nav-bar">
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    className={`nav-item ${screen === item.id ? "active" : ""}`}
                    onClick={() => navigate(item.id as Screen)}
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
