export type UserRole = "passenger" | "driver" | "admin";
export type PaymentMethod = "cash" | "transfer";
export type AutoAssignMode = "rating" | "trips" | "ads";

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  registeredAt?: string;
}

export interface OrderOptions {
  children: boolean;
  childrenCount: number;
  luggage: boolean;
  comment: string;
  deliveryDescription?: string;
  cargoDescription?: string;
}

export type ScheduleType = "now" | "scheduled";

export interface Order {
  id: string;
  passengerId: string;
  passengerName: string;
  passengerPhone?: string;
  from: string;
  to: string;
  tariff: "economy" | "hourly" | "delivery";
  options: OrderOptions;
  status: "pending" | "assigned" | "waiting" | "arrived" | "inprogress" | "done" | "cancelled";
  paymentMethod: PaymentMethod;
  tips: number;
  discount: number;
  distanceKm: number;
  driverId?: string;
  driverName?: string;
  driverCar?: string;
  price?: number;
  createdAt: string;
  createdTimestamp: number;
  etaMinutes?: number;
  freeAt?: number;
  acceptedVia?: "auto" | "free";
  cancelledBy?: "passenger" | "driver" | "admin";
  scheduledAt?: string;
  waitingMinutes?: number;
  fromLat?: number | null;
  fromLng?: number | null;
}

export interface DriverCarInfo {
  brand: string;
  model: string;
  plateNumber: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  car: string;
  carInfo: DriverCarInfo;
  rating: number;
  status: "active" | "busy" | "restricted";
  autoAssign: boolean;
  distanceKm: number;
  tripsCount: number;
  tripsLast24h: number;
  priority: number;
  login: string;
  password: string;
  hasAds: boolean;
  subscriptionDays: number;
  subscriptionStart?: number;
  freeWork: boolean;
  registeredAt: string;
  autoAssignDeclines: number;
  cancelledOrders: number;
  autoAssignTrips: number;
  freeTrips: number;
  totalEarnings: number;
  totalKm: number;
  totalHours: number;
  lat?: number | null;
  lng?: number | null;
  locationUpdatedAt?: number | null;
}

export interface AppSettings {
  priceFirstKm: number;
  pricePerKm: number;
  pricePerHour: number;
  priceDelivery: number;
  priceWaitingPerMin: number;
  autoAssignRadiusKm: number;
  freeOrderTimeoutMs: number;
  globalDiscount: number;
  kmDiscountThreshold: number;
  kmDiscount: number;
  autoAssignMode: AutoAssignMode;
  timeCoefficients: { from: number; to: number; coeff: number }[];
  adminPassword: string;
}

export interface SupportMessage {
  id: string;
  fromId: string;
  fromName: string;
  fromRole: UserRole;
  text: string;
  time: string;
  timestamp: number;
  read: boolean;
}

export interface PassengerStats {
  id: string;
  name: string;
  phone: string;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
}

export const LOGO_URL = "https://cdn.poehali.dev/projects/e03e7d24-4919-4d6e-81b9-d7fc9a11aa44/files/4162b8bc-c7fd-4b39-bd7c-b880e35d7c92.jpg";

export const INITIAL_DRIVERS: Driver[] = [];

export const INITIAL_ORDERS: Order[] = [];

export const INITIAL_SETTINGS: AppSettings = {
  priceFirstKm: 80,
  pricePerKm: 25,
  pricePerHour: 450,
  priceDelivery: 300,
  priceWaitingPerMin: 5,
  autoAssignRadiusKm: 5,
  freeOrderTimeoutMs: 240000,
  globalDiscount: 0,
  kmDiscountThreshold: 4,
  kmDiscount: 0,
  autoAssignMode: "rating",
  timeCoefficients: [
    { from: 22, to: 6, coeff: 1.5 },
    { from: 7, to: 9, coeff: 1.3 },
    { from: 17, to: 19, coeff: 1.2 },
  ],
  adminPassword: "admin75reg",
};

export const INITIAL_PASSENGERS: User[] = [];

export function calcOrderPrice(distKm: number, s: AppSettings, tariff: "economy" | "hourly" | "delivery"): number {
  if (tariff === "hourly") return s.pricePerHour;
  if (tariff === "delivery") return s.priceDelivery;
  const hour = new Date().getHours();
  let coeff = 1;
  for (const tc of s.timeCoefficients) {
    if (tc.from > tc.to) {
      if (hour >= tc.from || hour < tc.to) coeff = Math.max(coeff, tc.coeff);
    } else {
      if (hour >= tc.from && hour < tc.to) coeff = Math.max(coeff, tc.coeff);
    }
  }
  let price = s.priceFirstKm;
  if (distKm > 1) price += (distKm - 1) * s.pricePerKm;
  price = Math.round(price * coeff);
  if (s.globalDiscount > 0) price = Math.round(price * (1 - s.globalDiscount / 100));
  if (s.kmDiscount > 0 && distKm > s.kmDiscountThreshold) {
    const discountKm = distKm - s.kmDiscountThreshold;
    const discountAmount = Math.round(discountKm * s.pricePerKm * (s.kmDiscount / 100));
    price -= discountAmount;
  }
  return Math.max(price, s.priceFirstKm);
}

export function isSubscriptionActive(driver: Driver): boolean {
  if (driver.freeWork) return true;
  if (!driver.subscriptionStart || driver.subscriptionDays <= 0) return false;
  const elapsed = Date.now() - driver.subscriptionStart;
  return elapsed < driver.subscriptionDays * 86400000;
}

export function subscriptionDaysLeft(driver: Driver): number {
  if (driver.freeWork) return 999;
  if (!driver.subscriptionStart || driver.subscriptionDays <= 0) return 0;
  const elapsed = Date.now() - driver.subscriptionStart;
  const left = driver.subscriptionDays - Math.floor(elapsed / 86400000);
  return Math.max(0, left);
}