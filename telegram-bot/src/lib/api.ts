import axios from "axios";
import { CartItem, CustomerProfile } from "../types";

const API_URL = process.env.API_URL || "http://localhost:4000";
const BOT_API_KEY = process.env.BOT_API_KEY || "";

export const api = axios.create({
  baseURL: `${API_URL}/api/bot`,
  headers: { "x-bot-api-key": BOT_API_KEY },
  timeout: 10000,
});

export interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

export interface OrderSummary {
  id: number;
  orderNo: string;
  status: string;
  total: number;
  createdAt: string;
  items: { productName: string; quantity: number; price: number; total: number }[];
}

export async function linkCustomer(phone: string, chatId: number, username?: string): Promise<CustomerProfile | null> {
  try {
    const { data } = await api.post("/link", { phone, chatId, username });
    return data;
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

export async function getCustomer(chatId: number): Promise<CustomerProfile | null> {
  try {
    const { data } = await api.get(`/customers/${chatId}`);
    return data;
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

export async function getOrderHistory(chatId: number): Promise<OrderSummary[]> {
  const { data } = await api.get(`/customers/${chatId}/orders`);
  return data;
}

export async function getCategories(): Promise<string[]> {
  const { data } = await api.get("/products/categories");
  return data;
}

export async function getProducts(category?: string, search?: string): Promise<Product[]> {
  const { data } = await api.get("/products", { params: { category, search } });
  return data;
}

export async function createOrder(chatId: number, items: CartItem[], note?: string): Promise<OrderSummary> {
  const { data } = await api.post("/orders", {
    chatId,
    items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    note,
  });
  return data;
}
