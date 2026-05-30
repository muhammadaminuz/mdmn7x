import { Payment } from "../types";

export const payments: Payment[] = [
  { id: 1, orderId: 1, customerId: 1, customerName: "Baraka Savdo", agentId: 1, amount: 571_200, method: "CASH", createdAt: "2025-05-28T14:30:00Z" },
  { id: 2, orderId: 4, customerId: 8, customerName: "Yangi Hayot", agentId: 2, amount: 630_000, method: "CASH", createdAt: "2025-05-28T14:00:00Z" },
  { id: 3, customerId: 3, customerName: "Gold Market", agentId: 1, amount: 2_000_000, method: "BANK_TRANSFER", note: "Qarzning bir qismi", createdAt: "2025-05-28T11:30:00Z" },
  { id: 4, orderId: 6, customerId: 14, customerName: "Abdulla Market", agentId: 3, amount: 1_107_600, method: "CARD", createdAt: "2025-05-28T13:00:00Z" },
  { id: 5, orderId: 7, customerId: 19, customerName: "Bahor Market", agentId: 4, amount: 518_400, method: "CASH", createdAt: "2025-05-28T14:30:00Z" },
  { id: 6, customerId: 9, customerName: "Baxt Market", agentId: 2, amount: 1_500_000, method: "CASH", note: "Oldingi qarz uchun", createdAt: "2025-05-27T16:00:00Z" },
  { id: 7, orderId: 9, customerId: 24, customerName: "Husan Savdo", agentId: 6, amount: 1_144_000, method: "CASH", createdAt: "2025-05-28T13:30:00Z" },
  { id: 8, orderId: 14, customerId: 5, customerName: "Mehnat Savdo", agentId: 1, amount: 1_178_800, method: "CARD", createdAt: "2025-05-27T15:30:00Z" },
  { id: 9, orderId: 15, customerId: 25, customerName: "Shirin Bozor", agentId: 6, amount: 680_400, method: "CASH", createdAt: "2025-05-27T16:30:00Z" },
  { id: 10, customerId: 13, customerName: "Nargiza Savdo", agentId: 2, amount: 3_000_000, method: "BANK_TRANSFER", note: "Qarzning to'lovi", createdAt: "2025-05-27T12:00:00Z" },
];

export let paymentsStore = [...payments];
