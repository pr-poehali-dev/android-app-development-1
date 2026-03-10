let API_URL = "https://functions.poehali.dev/ca485884-1d2e-41f3-bc5f-ac87ec821ae5";

async function loadUrl() {
  if (API_URL) return;
  try {
    const res = await fetch("/backend/func2url.json");
    if (res.ok) {
      const data = await res.json();
      if (data["taxi-api"]) API_URL = data["taxi-api"];
    }
  } catch {
    /* not available yet */
  }
}

loadUrl();

async function call(action: string, body?: Record<string, unknown>) {
  if (!API_URL) {
    await loadUrl();
    if (!API_URL) return null;
  }
  try {
    const res = await fetch(`${API_URL}?action=${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok && data?.error) {
      console.error(`API ${action}:`, data.error);
    }
    return data;
  } catch (err) {
    console.error(`Fetch error:`, err, `for ${API_URL}?action=${action}`);
    return null;
  }
}

export const api = {
  ping: () => call("ping"),
  authPassenger: (data: { id: string; name: string; phone: string }) => call("auth-passenger", data),
  authDriver: (data: { login: string; password: string }) => call("auth-driver", data),
  authAdmin: (data: { login: string; password: string }) => call("auth-admin", data),
  getState: (role: string) => call("get-state", { role }),
  createOrder: (order: Record<string, unknown>) => call("create-order", order),
  updateOrder: (orderId: string, status: string) => call("update-order", { orderId, status }),
  cancelOrder: (orderId: string, cancelledBy: string) => call("cancel-order", { orderId, cancelledBy }),
  acceptOrder: (data: { orderId: string; driverId: string; driverName: string; eta?: number }) => call("accept-order", data),
  updateSettings: (settings: Record<string, unknown>) => call("update-settings", settings),
  updateDriver: (id: string, changes: Record<string, unknown>) => call("update-driver", { id, changes }),
  addDriver: (driver: Record<string, unknown>) => call("add-driver", driver),
  toggleAutoAssign: (driverId: string) => call("toggle-auto-assign", { driverId }),
  updateDriverCar: (driverId: string, carInfo: Record<string, unknown>) => call("update-driver-car", { driverId, carInfo }),
  sendSupport: (msg: Record<string, unknown>) => call("send-support", msg),
  getSupport: () => call("get-support", {}),
  rateDriver: (driverId: string, rating: number) => call("rate-driver", { driverId, rating }),
  getDriverChat: () => call("get-driver-chat", {}),
  sendDriverChat: (driverId: string, driverName: string, text: string) => call("send-driver-chat", { driverId, driverName, text }),
  sendRideChat: (orderId: string, senderRole: string, senderId: string, senderName: string, text: string) => call("send-ride-chat", { orderId, senderRole, senderId, senderName, text }),
  getRideChat: (orderId: string) => call("get-ride-chat", { orderId }),
  completeOrder: (orderId: string, driverId: string) => call("complete-order", { orderId, driverId }),
  updateDriverLocation: (driverId: string, lat: number, lng: number) => call("update-driver-location", { driverId, lat, lng }),
  deleteDriver: (id: string) => call("delete-driver", { id }),
  deleteUser: (id: string) => call("delete-user", { id }),
  markRead: (userId: string, readerRole: string) => call("mark-read", { userId, readerRole }),
  poll: (role: string, userId: string, hash?: string) => call("poll", { role, userId, hash: hash || "" }),
  isConnected: () => !!API_URL,
};

export default api;