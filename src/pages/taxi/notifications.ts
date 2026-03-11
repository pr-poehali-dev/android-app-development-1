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

let activeOrderAudio: { stop: () => void } | null = null;

export function stopOrderSound(): void {
  if (activeOrderAudio) {
    activeOrderAudio.stop();
    activeOrderAudio = null;
  }
}

export function playNotificationSound(type: "order" | "message" | "arrive" = "order"): void {
  try {
    const ctx = new AudioContext();

    if (type === "message") {
      // Android-style message notification: two-tone "do-mi"
      const notes = [
        { freq: 880, start: 0, dur: 0.08 },
        { freq: 1175, start: 0.1, dur: 0.12 },
      ];
      notes.forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + start + 0.01);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur + 0.01);
      });
    } else if (type === "arrive") {
      // Pleasant arrival chime: ascending triad C-E-G
      const notes = [
        { freq: 523, start: 0, dur: 0.18 },
        { freq: 659, start: 0.15, dur: 0.18 },
        { freq: 784, start: 0.3, dur: 0.3 },
      ];
      notes.forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur + 0.01);
      });
    } else {
      // Order notification: Viber-like bright ascending tones
      const notes = [
        { freq: 784, start: 0, dur: 0.12 },
        { freq: 988, start: 0.12, dur: 0.12 },
        { freq: 1175, start: 0.24, dur: 0.12 },
        { freq: 1319, start: 0.36, dur: 0.2 },
      ];
      notes.forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur + 0.01);
      });
    }
  } catch (_e) { void _e; }
}

export function playLoopingOrderSound(): () => void {
  stopOrderSound();
  let stopped = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const play = () => {
    if (stopped) return;
    playNotificationSound("order");
    timeoutId = setTimeout(play, 2000);
  };
  play();

  const stop = () => {
    stopped = true;
    if (timeoutId) clearTimeout(timeoutId);
    activeOrderAudio = null;
  };

  activeOrderAudio = { stop };
  return stop;
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