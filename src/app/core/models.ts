// Типы повторяют DTO и модели бэкенда (events-platform)

export type Role = 'ADMIN' | 'MANAGER' | 'USER';

export interface Page<T> {
  content: T[];
  page: { size: number; number: number; totalElements: number; totalPages: number };
}

export interface ProblemDetail {
  status: number;
  title?: string;
  detail?: string;
  errors?: Record<string, string>;
}

// user-service
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  tokenType: string;
  expiresInSeconds: number;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
  fullName: string;
  phone: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  phone: string;
  roleId: number;
  createdAt: string;
}

// event-service
export interface Category {
  id: number;
  name: string;
}

export interface Location {
  id: number;
  name: string;
  address: string;
  city: string;
  capacity: number;
}

export interface EventItem {
  id: number;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  location: Location;
  category: Category;
  organizerId: number;
  maxParticipants: number;
  // минимальная цена билета для регистрации; 0 - подходит любой билет
  minTicketPrice: number;
  // /api/events/{id}/image?v=...; null - картинки нет
  imageUrl: string | null;
}

export interface EventRequest {
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  locationId: number;
  categoryId: number;
  maxParticipants: number | null;
  minTicketPrice: number;
}

// booking-service
export interface Ticket {
  id: number;
  type: string;
  price: number;
  quantity: number;
}

export type OrderStatus = 'CREATED' | 'CANCELLED';

export interface OrderItem {
  id: number;
  ticketId: number;
  ticketType: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: number;
  userId: number;
  orderDate: string;
  totalPrice: number;
  status: OrderStatus;
  items: OrderItem[];
}

export interface OrderRequest {
  items: { ticketId: number; quantity: number }[];
}

// Своя позиция неотмененного заказа с неиспользованными билетами
export interface AvailableOrderItem {
  orderItemId: number;
  orderId: number;
  orderDate: string;
  ticketType: string;
  unitPrice: number;
  quantity: number;
  remaining: number;
}

export type RegistrationStatus = 'CONFIRMED' | 'CANCELLED';

export interface Registration {
  id: number;
  userId: number;
  eventId: number;
  eventTitle: string;
  orderItemId: number;
  ticketType: string;
  registrationDate: string;
  status: RegistrationStatus;
  // время прохода на мероприятие; null - билет не использован
  checkedInAt: string | null;
}

// notification-service
export type NotificationType =
  | 'ORDER_CREATED'
  | 'ORDER_CANCELLED'
  | 'REGISTRATION_CREATED'
  | 'REGISTRATION_CANCELLED'
  | 'EVENT_REMINDER';

// Не Notification: так называется браузерный API
export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  // маршрут клиента, например /orders
  link: string;
  read: boolean;
  createdAt: string;
}

// ticket-pass-service
export interface Pass {
  registrationId: number;
  eventId: number;
  eventTitle: string;
  ticketType: string;
  startDate: string;
  endDate: string;
  locationName: string;
  locationAddress: string;
  token: string;
  // страница проверки билета, она же содержимое QR-кода
  checkInUrl: string;
  // data URI с PNG
  qrCode: string;
}

export interface CheckInResult {
  registrationId: number;
  userId: number;
  eventId: number;
  eventTitle: string;
  ticketType: string;
  checkedInAt: string;
}

// reminder-service
export interface ReminderRun {
  date: string;
  events: number;
  published: number;
  failed: number;
}
