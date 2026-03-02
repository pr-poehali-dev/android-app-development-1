export type UserRole = "passenger" | "driver" | "admin";

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  avatar?: string;
}

export interface OrderOptions {
  children: boolean;
  childrenCount: number;
  luggage: boolean;
  comment: string;
  deliveryDescription?: string;
}

export interface Order {
  id: string;
  passengerId: string;
  passengerName: string;
  from: string;
  to: string;
  tariff: "economy" | "hourly" | "delivery";
  options: OrderOptions;
  status: "pending" | "assigned" | "arrived" | "inprogress" | "done" | "cancelled";
  driverId?: string;
  driverName?: string;
  driverCar?: string;
  price?: number;
  createdAt: string;
  etaMinutes?: number;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  car: string;
  rating: number;
  status: "active" | "busy" | "restricted";
  autoAssign: boolean;
  distanceKm: number;
  tripsCount: number;
  login?: string;
  password?: string;
}

export interface AppSettings {
  autoAssignRadiusKm: number;
  pricePerKm: number;
  pricePerHour: number;
  priceDelivery: number;
}

export interface ChatMessage {
  id: string;
  from: "passenger" | "driver" | "admin" | "system";
  text: string;
  time: string;
}

export interface AppState {
  user: User | null;
  orders: Order[];
  drivers: Driver[];
  settings: AppSettings;
}

export const LOGO_URL = "https://cdn.poehali.dev/projects/e03e7d24-4919-4d6e-81b9-d7fc9a11aa44/files/0aabc268-0646-49d3-996b-6fc1d8262c79.jpg";

export const INITIAL_DRIVERS: Driver[] = [
  { id: "d1", name: "Алексей Козлов", phone: "+7 916 111-22-33", car: "Toyota Camry • А123БВ", rating: 4.9, status: "active", autoAssign: true, distanceKm: 1.2, tripsCount: 234, login: "kozlov", password: "driver1" },
  { id: "d2", name: "Иван Морозов", phone: "+7 916 444-55-66", car: "Kia Rio • В456ГД", rating: 4.7, status: "active", autoAssign: false, distanceKm: 3.5, tripsCount: 89, login: "morozov", password: "driver2" },
  { id: "d3", name: "Дмитрий Рябов", phone: "+7 916 777-88-99", car: "Hyundai Solaris • Е789ЖЗ", rating: 4.8, status: "busy", autoAssign: true, distanceKm: 5.1, tripsCount: 412, login: "ryabov", password: "driver3" },
  { id: "d4", name: "Сергей Волков", phone: "+7 916 000-11-22", car: "Volkswagen Polo • И012КЛ", rating: 3.2, status: "restricted", autoAssign: false, distanceKm: 2.7, tripsCount: 44, login: "volkov", password: "driver4" },
];

export const INITIAL_ORDERS: Order[] = [
  { id: "o1", passengerId: "p1", passengerName: "Мария С.", from: "Ленина, 12", to: "Аэропорт Домодедово", tariff: "economy", options: { children: false, childrenCount: 0, luggage: true, comment: "Большой чемодан" }, status: "pending", price: 849, createdAt: "14:32" },
  { id: "o2", passengerId: "p2", passengerName: "Андрей П.", from: "Садовая, 5", to: "ТЦ Мега", tariff: "economy", options: { children: true, childrenCount: 2, luggage: false, comment: "Дети до 7 лет, нужно автокресло" }, status: "pending", price: 342, createdAt: "14:45" },
  { id: "o3", passengerId: "p3", passengerName: "Ольга К.", from: "Проспект Мира, 1", to: "ВДНХ", tariff: "economy", options: { children: false, childrenCount: 0, luggage: false, comment: "" }, status: "assigned", driverId: "d3", driverName: "Дмитрий Р.", driverCar: "Hyundai Solaris • Е789ЖЗ", price: 198, createdAt: "14:50" },
];

export const INITIAL_SETTINGS: AppSettings = {
  autoAssignRadiusKm: 5,
  pricePerKm: 25,
  pricePerHour: 450,
  priceDelivery: 300,
};