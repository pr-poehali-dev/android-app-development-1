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

export const LOGO_URL = "https://cdn.poehali.dev/projects/e03e7d24-4919-4d6e-81b9-d7fc9a11aa44/files/b06ff327-60a9-4558-a8d1-5ce55e5ef2f6.jpg";

export const INITIAL_DRIVERS: Driver[] = [
  { id: "d1", name: "Алексей Козлов", phone: "+7 916 111-22-33", car: "Toyota Camry • А123БВ", carInfo: { brand: "Toyota", model: "Camry", plateNumber: "А123БВ" }, rating: 4.9, status: "active", autoAssign: true, distanceKm: 1.2, tripsCount: 234, tripsLast24h: 5, priority: 1, login: "kozlov", password: "driver1", hasAds: true, subscriptionDays: 30, subscriptionStart: Date.now() - 86400000 * 5, freeWork: false, registeredAt: "2025-12-01", autoAssignDeclines: 2, cancelledOrders: 3, autoAssignTrips: 150, freeTrips: 84, totalEarnings: 58000, totalKm: 4200, totalHours: 310 },
  { id: "d2", name: "Иван Морозов", phone: "+7 916 444-55-66", car: "Kia Rio • В456ГД", carInfo: { brand: "Kia", model: "Rio", plateNumber: "В456ГД" }, rating: 4.7, status: "active", autoAssign: false, distanceKm: 3.5, tripsCount: 89, tripsLast24h: 2, priority: 1, login: "morozov", password: "driver2", hasAds: false, subscriptionDays: 15, subscriptionStart: Date.now() - 86400000 * 10, freeWork: false, registeredAt: "2026-01-15", autoAssignDeclines: 5, cancelledOrders: 1, autoAssignTrips: 30, freeTrips: 59, totalEarnings: 22000, totalKm: 1800, totalHours: 120 },
  { id: "d3", name: "Дмитрий Рябов", phone: "+7 916 777-88-99", car: "Hyundai Solaris • Е789ЖЗ", carInfo: { brand: "Hyundai", model: "Solaris", plateNumber: "Е789ЖЗ" }, rating: 4.8, status: "busy", autoAssign: true, distanceKm: 5.1, tripsCount: 412, tripsLast24h: 8, priority: 2, login: "ryabov", password: "driver3", hasAds: true, subscriptionDays: 60, subscriptionStart: Date.now() - 86400000 * 3, freeWork: false, registeredAt: "2025-10-20", autoAssignDeclines: 1, cancelledOrders: 5, autoAssignTrips: 280, freeTrips: 132, totalEarnings: 105000, totalKm: 8900, totalHours: 620 },
  { id: "d4", name: "Сергей Волков", phone: "+7 916 000-11-22", car: "Volkswagen Polo • И012КЛ", carInfo: { brand: "Volkswagen", model: "Polo", plateNumber: "И012КЛ" }, rating: 3.2, status: "restricted", autoAssign: false, distanceKm: 2.7, tripsCount: 44, tripsLast24h: 0, priority: 3, login: "volkov", password: "driver4", hasAds: false, subscriptionDays: 0, freeWork: false, registeredAt: "2026-02-01", autoAssignDeclines: 12, cancelledOrders: 8, autoAssignTrips: 10, freeTrips: 34, totalEarnings: 9500, totalKm: 620, totalHours: 45 },
];

export const INITIAL_ORDERS: Order[] = [
  { id: "o1", passengerId: "p1", passengerName: "Мария С.", passengerPhone: "+7 999 111-22-33", from: "Ленина, 12", to: "Аэропорт Домодедово", tariff: "economy", options: { children: false, childrenCount: 0, luggage: true, comment: "Большой чемодан" }, status: "pending", paymentMethod: "cash", tips: 0, discount: 0, distanceKm: 34, price: 849, createdAt: "14:32", createdTimestamp: Date.now() - 600000, freeAt: Date.now() - 300000 },
  { id: "o2", passengerId: "p2", passengerName: "Андрей П.", passengerPhone: "+7 999 444-55-66", from: "Садовая, 5", to: "ТЦ Мега", tariff: "economy", options: { children: true, childrenCount: 2, luggage: false, comment: "Дети до 7 лет, нужно автокресло" }, status: "pending", paymentMethod: "transfer", tips: 100, discount: 0, distanceKm: 12, price: 342, createdAt: "14:45", createdTimestamp: Date.now() - 300000, freeAt: Date.now() - 60000 },
  { id: "o3", passengerId: "p3", passengerName: "Ольга К.", passengerPhone: "+7 999 777-88-99", from: "Проспект Мира, 1", to: "ВДНХ", tariff: "economy", options: { children: false, childrenCount: 0, luggage: false, comment: "" }, status: "assigned", paymentMethod: "cash", tips: 50, discount: 0, distanceKm: 5, driverId: "d3", driverName: "Дмитрий Р.", driverCar: "Hyundai Solaris • Е789ЖЗ", price: 198, createdAt: "14:50", createdTimestamp: Date.now() - 120000 },
];

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

export const INITIAL_PASSENGERS: User[] = [
  { id: "p1", name: "Мария С.", phone: "+7 999 111-22-33", role: "passenger", registeredAt: "2026-01-10" },
  { id: "p2", name: "Андрей П.", phone: "+7 999 444-55-66", role: "passenger", registeredAt: "2026-02-05" },
  { id: "p3", name: "Ольга К.", phone: "+7 999 777-88-99", role: "passenger", registeredAt: "2026-02-15" },
];

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