import { RouteStop } from "../types";

const today = new Date().toISOString().split("T")[0];

export const routeStops: RouteStop[] = [
  { id: 1, agentId: 1, customerId: 2, customerName: "Nur Bozor", address: "Chilonzor ko'chasi, 2-uy", latitude: 41.298, longitude: 69.241, plannedTime: `${today}T09:00:00Z`, status: "VISITED", orderId: 2, collectionAmount: 0, date: today, order: 1 },
  { id: 2, agentId: 1, customerId: 1, customerName: "Baraka Savdo", address: "Chilonzor ko'chasi, 1-uy", latitude: 41.2965, longitude: 69.239, plannedTime: `${today}T10:00:00Z`, status: "VISITED", orderId: 1, collectionAmount: 571_200, date: today, order: 2 },
  { id: 3, agentId: 1, customerId: 3, customerName: "Gold Market", address: "Chilonzor ko'chasi, 3-uy", latitude: 41.294, longitude: 69.237, plannedTime: `${today}T11:00:00Z`, status: "VISITED", orderId: 3, collectionAmount: 2_000_000, date: today, order: 3 },
  { id: 4, agentId: 1, customerId: 4, customerName: "Sham Do'koni", address: "Chilonzor ko'chasi, 4-uy", latitude: 41.292, longitude: 69.235, plannedTime: `${today}T12:00:00Z`, status: "PENDING", date: today, order: 4 },
  { id: 5, agentId: 1, customerId: 5, customerName: "Mehnat Savdo", address: "Chilonzor ko'chasi, 5-uy", latitude: 41.301, longitude: 69.243, plannedTime: `${today}T13:00:00Z`, status: "PENDING", date: today, order: 5 },
  { id: 6, agentId: 1, customerId: 6, customerName: "Inson Bozori", address: "Chilonzor ko'chasi, 6-uy", latitude: 41.3025, longitude: 69.245, plannedTime: `${today}T14:00:00Z`, status: "PENDING", date: today, order: 6 },
  { id: 7, agentId: 1, customerId: 26, customerName: "Ozoda Market", address: "Chilonzor ko'chasi, 26-uy", latitude: 41.2955, longitude: 69.2395, plannedTime: `${today}T15:00:00Z`, status: "PENDING", date: today, order: 7 },
  { id: 8, agentId: 2, customerId: 8, customerName: "Yangi Hayot", address: "Yunusobod ko'chasi, 8-uy", latitude: 41.321, longitude: 69.284, plannedTime: `${today}T09:00:00Z`, status: "VISITED", orderId: 4, collectionAmount: 630_000, date: today, order: 1 },
  { id: 9, agentId: 2, customerId: 9, customerName: "Baxt Market", address: "Yunusobod ko'chasi, 9-uy", latitude: 41.323, longitude: 69.286, plannedTime: `${today}T10:00:00Z`, status: "VISITED", orderId: 5, collectionAmount: 1_500_000, date: today, order: 2 },
  { id: 10, agentId: 2, customerId: 10, customerName: "Islom Savdo", address: "Yunusobod ko'chasi, 10-uy", latitude: 41.3245, longitude: 69.289, plannedTime: `${today}T11:00:00Z`, status: "PENDING", date: today, order: 3 },
];
