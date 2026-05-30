import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { ordersStore } from "../data/orders";

const router = Router();

router.get("/", authenticate, (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 20, status, agentId, customerId, search, dateFrom, dateTo } = req.query;
  let result = [...ordersStore];
  if (status) result = result.filter((o) => o.status === status);
  if (agentId) result = result.filter((o) => o.agentId === Number(agentId));
  if (customerId) result = result.filter((o) => o.customerId === Number(customerId));
  if (search) result = result.filter((o) => o.orderNo.includes(String(search)) || o.customerName.toLowerCase().includes(String(search).toLowerCase()));
  if (dateFrom) result = result.filter((o) => o.createdAt >= String(dateFrom));
  if (dateTo) result = result.filter((o) => o.createdAt <= String(dateTo));
  if (req.user?.role === "SALES_AGENT" && req.user.agentId) {
    result = result.filter((o) => o.agentId === req.user!.agentId);
  }
  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const total = result.length;
  const p = Number(page);
  const l = Number(limit);
  const items = result.slice((p - 1) * l, p * l);
  res.json({ items, total, page: p, limit: l, totalPages: Math.ceil(total / l) });
});

router.get("/:id", authenticate, (req: AuthRequest, res: Response) => {
  const order = ordersStore.find((o) => o.id === Number(req.params.id));
  if (!order) return res.status(404).json({ error: "Order not found" });
  return res.json(order);
});

router.post("/", authenticate, (req: AuthRequest, res: Response) => {
  const { customerId, customerName, items, discount = 0, note } = req.body;
  const agentId = req.user?.agentId || req.body.agentId;
  const agentName = req.body.agentName || "Unknown";
  const subtotal = items.reduce((s: number, i: { total: number }) => s + i.total, 0);
  const total = subtotal - discount;
  const newOrder = {
    id: ordersStore.length + 1,
    orderNo: `ORD-2025-${String(ordersStore.length + 1).padStart(4, "0")}`,
    customerId,
    customerName,
    agentId,
    agentName,
    status: "DRAFT" as const,
    items,
    subtotal,
    discount,
    total,
    note,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  ordersStore.push(newOrder);
  res.status(201).json(newOrder);
});

router.put("/:id/status", authenticate, (req: AuthRequest, res: Response) => {
  const idx = ordersStore.findIndex((o) => o.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "Order not found" });
  const { status } = req.body;
  ordersStore[idx] = {
    ...ordersStore[idx],
    status,
    updatedAt: new Date().toISOString(),
    ...(status === "DELIVERED" ? { deliveredAt: new Date().toISOString() } : {}),
  };
  return res.json(ordersStore[idx]);
});

export default router;
