export type Role = "SUPER_ADMIN" | "DIRECTOR" | "SUPERVISOR" | "SALES_MANAGER" | "SALES_AGENT" | "WAREHOUSE_OPERATOR" | "ACCOUNTANT";
export type OrderStatus = "DRAFT" | "PENDING" | "APPROVED" | "DELIVERED" | "CANCELLED";
export type CustomerStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  agentId?: number;
}

export interface KpiData {
  dailySales: number;
  monthlyRevenue: number;
  collectionAmount: number;
  debtAmount: number;
  activeAgents: number;
  activeCustomers: number;
  warehouseStock: number;
  routeCompletion: number;
  totalCustomers: number;
  todayOrders: number;
  pendingOrders: number;
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

export interface Payment {
  id: number;
  orderId?: number;
  customerId: number;
  customerName: string;
  agentId: number;
  amount: number;
  method: string;
  note?: string;
  createdAt: string;
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
