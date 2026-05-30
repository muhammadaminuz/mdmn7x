import { Order } from "../types";

function makeOrder(
  id: number,
  customerId: number,
  customerName: string,
  agentId: number,
  agentName: string,
  status: Order["status"],
  createdAt: string,
  items: Order["items"],
  discount = 0,
  deliveredAt?: string
): Order {
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const total = subtotal - discount;
  return {
    id,
    orderNo: `ORD-2025-${String(id).padStart(4, "0")}`,
    customerId,
    customerName,
    agentId,
    agentName,
    status,
    items,
    subtotal,
    discount,
    total,
    createdAt,
    updatedAt: createdAt,
    deliveredAt,
  };
}

export const orders: Order[] = [
  makeOrder(1, 1, "Baraka Savdo", 1, "Jasur Mirzayev", "DELIVERED", "2025-05-28T09:00:00Z", [
    { productId: 1, productName: "Coca-Cola 0.5L", quantity: 48, price: 6_500, total: 312_000 },
    { productId: 14, productName: "Snickers 50g", quantity: 24, price: 7_000, total: 168_000 },
    { productId: 18, productName: "Nestle Pure Life 1.5L", quantity: 24, price: 3_800, total: 91_200 },
  ], 0, "2025-05-28T14:00:00Z"),

  makeOrder(2, 2, "Nur Bozor", 1, "Jasur Mirzayev", "DELIVERED", "2025-05-28T10:00:00Z", [
    { productId: 2, productName: "Pepsi 0.5L", quantity: 24, price: 6_000, total: 144_000 },
    { productId: 7, productName: "Lays Original 75g", quantity: 12, price: 9_500, total: 114_000 },
  ], 0, "2025-05-28T15:00:00Z"),

  makeOrder(3, 3, "Gold Market", 1, "Jasur Mirzayev", "APPROVED", "2025-05-28T11:00:00Z", [
    { productId: 1, productName: "Coca-Cola 0.5L", quantity: 96, price: 6_500, total: 624_000 },
    { productId: 2, productName: "Pepsi 0.5L", quantity: 48, price: 6_000, total: 288_000 },
    { productId: 3, productName: "Fanta Orange 0.5L", quantity: 48, price: 6_000, total: 288_000 },
    { productId: 29, productName: "Red Bull 250ml", quantity: 12, price: 17_600, total: 211_200 },
  ], 50_000),

  makeOrder(4, 8, "Yangi Hayot", 2, "Bobur Qodirov", "DELIVERED", "2025-05-28T09:30:00Z", [
    { productId: 11, productName: "Activia Yogurt 280g", quantity: 24, price: 12_000, total: 288_000 },
    { productId: 12, productName: "Parmalat Milk 1L", quantity: 12, price: 14_500, total: 174_000 },
    { productId: 25, productName: "Lipton Yellow Label 100пак", quantity: 6, price: 28_000, total: 168_000 },
  ], 0, "2025-05-28T13:30:00Z"),

  makeOrder(5, 9, "Baxt Market", 2, "Bobur Qodirov", "PENDING", "2025-05-28T11:00:00Z", [
    { productId: 26, productName: "Head & Shoulders 400ml", quantity: 12, price: 44_000, total: 528_000 },
    { productId: 27, productName: "Ariel Pods 30шт", quantity: 6, price: 68_000, total: 408_000 },
    { productId: 28, productName: "Pampers Active 4 54шт", quantity: 4, price: 96_000, total: 384_000 },
  ], 50_000),

  makeOrder(6, 14, "Abdulla Market", 3, "Eldor Xasanov", "DELIVERED", "2025-05-28T08:30:00Z", [
    { productId: 9, productName: "Pringles Original 165g", quantity: 24, price: 20_000, total: 480_000 },
    { productId: 30, productName: "Oreo Original 176g", quantity: 24, price: 14_400, total: 345_600 },
    { productId: 24, productName: "Nescafe Classic 190g", quantity: 6, price: 52_000, total: 312_000 },
  ], 30_000, "2025-05-28T12:30:00Z"),

  makeOrder(7, 19, "Bahor Market", 4, "Kamol Tursunov", "DELIVERED", "2025-05-28T09:00:00Z", [
    { productId: 18, productName: "Nestle Pure Life 1.5L", quantity: 48, price: 3_800, total: 182_400 },
    { productId: 19, productName: "Bonaqua 1.5L", quantity: 48, price: 3_400, total: 163_200 },
    { productId: 21, productName: "Capri-Sun Orange 200ml", quantity: 36, price: 4_800, total: 172_800 },
  ], 0, "2025-05-28T14:00:00Z"),

  makeOrder(8, 22, "Anvar Bozor", 5, "Ravshan Normatov", "APPROVED", "2025-05-28T10:00:00Z", [
    { productId: 22, productName: "J7 Apple 1L", quantity: 12, price: 11_200, total: 134_400 },
    { productId: 23, productName: "Rich Mango 1L", quantity: 12, price: 11_200, total: 134_400 },
    { productId: 5, productName: "Lipton Ice Tea 0.5L", quantity: 24, price: 7_200, total: 172_800 },
  ], 20_000),

  makeOrder(9, 24, "Husan Savdo", 6, "Sanjar Yoʻldoshev", "DELIVERED", "2025-05-28T09:00:00Z", [
    { productId: 14, productName: "Snickers 50g", quantity: 48, price: 7_000, total: 336_000 },
    { productId: 15, productName: "Twix 50g", quantity: 48, price: 7_000, total: 336_000 },
    { productId: 16, productName: "KitKat 45g", quantity: 36, price: 7_500, total: 270_000 },
    { productId: 17, productName: "Bounty 57g", quantity: 36, price: 7_000, total: 252_000 },
  ], 50_000, "2025-05-28T13:00:00Z"),

  makeOrder(10, 4, "Sham Doʻkoni", 1, "Jasur Mirzayev", "DRAFT", "2025-05-28T14:00:00Z", [
    { productId: 4, productName: "Sprite 0.5L", quantity: 24, price: 6_000, total: 144_000 },
    { productId: 10, productName: "Cheetos 80g", quantity: 24, price: 8_800, total: 211_200 },
  ]),

  makeOrder(11, 10, "Islom Savdo", 2, "Bobur Qodirov", "DELIVERED", "2025-05-27T09:00:00Z", [
    { productId: 1, productName: "Coca-Cola 0.5L", quantity: 72, price: 6_500, total: 468_000 },
    { productId: 4, productName: "Sprite 0.5L", quantity: 48, price: 6_000, total: 288_000 },
  ], 0, "2025-05-27T14:00:00Z"),

  makeOrder(12, 15, "Umid Bozor", 3, "Eldor Xasanov", "DELIVERED", "2025-05-27T10:00:00Z", [
    { productId: 12, productName: "Parmalat Milk 1L", quantity: 24, price: 14_500, total: 348_000 },
    { productId: 13, productName: "Mascarpone 500g", quantity: 6, price: 36_000, total: 216_000 },
  ], 0, "2025-05-27T15:00:00Z"),

  makeOrder(13, 20, "Tolib Savdo", 4, "Kamol Tursunov", "CANCELLED", "2025-05-27T11:00:00Z", [
    { productId: 28, productName: "Pampers Active 4 54шт", quantity: 10, price: 96_000, total: 960_000 },
  ]),

  makeOrder(14, 5, "Mehnat Savdo", 1, "Jasur Mirzayev", "DELIVERED", "2025-05-27T09:30:00Z", [
    { productId: 7, productName: "Lays Original 75g", quantity: 48, price: 9_500, total: 456_000 },
    { productId: 8, productName: "Lays Sour Cream 75g", quantity: 48, price: 9_500, total: 456_000 },
    { productId: 10, productName: "Cheetos 80g", quantity: 36, price: 8_800, total: 316_800 },
  ], 50_000, "2025-05-27T15:00:00Z"),

  makeOrder(15, 25, "Shirin Bozor", 6, "Sanjar Yoʻldoshev", "DELIVERED", "2025-05-27T10:00:00Z", [
    { productId: 20, productName: "Evian 0.75L", quantity: 24, price: 12_000, total: 288_000 },
    { productId: 29, productName: "Red Bull 250ml", quantity: 24, price: 17_600, total: 422_400 },
  ], 30_000, "2025-05-27T16:00:00Z"),
];

export let ordersStore = [...orders];
