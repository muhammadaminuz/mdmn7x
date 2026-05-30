export type Role =
  | "SUPER_ADMIN"
  | "DIRECTOR"
  | "SUPERVISOR"
  | "SALES_MANAGER"
  | "SALES_AGENT"
  | "WAREHOUSE_OPERATOR"
  | "ACCOUNTANT";

export type OrderStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "DELIVERED"
  | "CANCELLED";

export type CustomerStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";

export type PaymentMethod = "CASH" | "CARD" | "BANK_TRANSFER" | "CHEQUE";

export interface User {
  id: number;
  fullName: string;
  email: string;
  password: string;
  phone: string;
  role: Role;
  agentId?: number;
  warehouseId?: number;
  isActive: boolean;
  createdAt: string;
}

export interface Customer {
  id: number;
  companyName: string;
  ownerName: string;
  phone: string;
  region: string;
  district: string;
  address: string;
  latitude: number;
  longitude: number;
  debt: number;
  balance: number;
  status: CustomerStatus;
  agentId: number;
  territoryId: number;
  createdAt: string;
  lastVisit?: string;
}

export interface Product {
  id: number;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  price: number;
  wholesalePrice: number;
  stock: number;
  warehouseId: number;
  image: string;
  isActive: boolean;
  minStock: number;
  expiryDate?: string;
  batchNo?: string;
}

export interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Order {
  id: number;
  orderNo: string;
  customerId: number;
  customerName: string;
  agentId: number;
  agentName: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
}

export interface Agent {
  id: number;
  fullName: string;
  phone: string;
  email: string;
  territoryId: number;
  territoryName: string;
  monthlyTarget: number;
  currentSales: number;
  performance: number;
  customersCount: number;
  isActive: boolean;
  latitude?: number;
  longitude?: number;
  lastSeen?: string;
  userId: number;
}

export interface Territory {
  id: number;
  name: string;
  region: string;
  agentId?: number;
  agentName?: string;
  customersCount: number;
  totalSales: number;
  totalDebt: number;
}

export interface Warehouse {
  id: number;
  name: string;
  location: string;
  manager: string;
  phone: string;
  totalProducts: number;
  totalValue: number;
  isActive: boolean;
}

export interface InventoryItem {
  id: number;
  productId: number;
  productName: string;
  sku: string;
  warehouseId: number;
  warehouseName: string;
  quantity: number;
  reservedQty: number;
  availableQty: number;
  lastUpdated: string;
}

export interface Payment {
  id: number;
  orderId?: number;
  customerId: number;
  customerName: string;
  agentId: number;
  amount: number;
  method: PaymentMethod;
  note?: string;
  createdAt: string;
}

export interface Debt {
  id: number;
  customerId: number;
  customerName: string;
  phone: string;
  agentId: number;
  agentName: string;
  totalDebt: number;
  dueDate?: string;
  overdueDays?: number;
  lastPayment?: string;
  status: "CURRENT" | "OVERDUE" | "CRITICAL";
}

export interface Notification {
  id: number;
  type:
    | "NEW_ORDER"
    | "DEBT_REMINDER"
    | "TARGET_ACHIEVED"
    | "LOW_STOCK"
    | "PAYMENT_RECEIVED";
  title: string;
  message: string;
  isRead: boolean;
  userId?: number;
  createdAt: string;
}

export interface RouteStop {
  id: number;
  agentId: number;
  customerId: number;
  customerName: string;
  address: string;
  latitude: number;
  longitude: number;
  plannedTime: string;
  status: "PENDING" | "VISITED" | "SKIPPED";
  orderId?: number;
  collectionAmount?: number;
  date: string;
  order: number;
}

export interface JwtPayload {
  userId: number;
  role: Role;
  agentId?: number;
  email: string;
  iat?: number;
  exp?: number;
}
