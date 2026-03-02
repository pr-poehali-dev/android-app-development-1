let permissionGranted = false;

export function requestNotificationPermission(): void {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    permissionGranted = true;
    return;
  }
  if (Notification.permission !== "denied") {
    Notification.requestPermission().then((p) => {
      permissionGranted = p === "granted";
    });
  }
}

export function sendPush(title: string, body: string): void {
  if (!permissionGranted && "Notification" in window) {
    if (Notification.permission === "granted") permissionGranted = true;
  }
  if (permissionGranted) {
    try { new Notification(title, { body, icon: "/favicon.ico" }); } catch (_e) { void _e; }
  }
}

export function playNotificationSound(type: "order" | "message" | "arrive" = "order"): void {
  try {
    const ctx = new AudioContext();
    const freqs = type === "order" ? [880, 1100] : type === "message" ? [660, 880] : [523, 659, 784];
    freqs.forEach((freq, i) => {
      setTimeout(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.value = 0.25;
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }, i * 200);
    });
  } catch (_e) { void _e; }
}

const STORAGE_KEY = "sovyonok_session";

export interface SavedSession {
  userId: string;
  role: "passenger" | "driver" | "admin";
  name: string;
  phone: string;
  driverLogin?: string;
}

export function saveSession(s: SavedSession): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (_e) { void _e; }
}

export function loadSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_e) { void _e; return null; }
}

export function clearSession(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_e) { void _e; }
}
