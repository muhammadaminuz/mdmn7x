import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { paymentsStore } from "../data/payments";
import { customers } from "../data/customers";

const router = Router();

router.get("/", authenticate, (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 20, agentId, customerId, method } = req.query;
  let result = [...paymentsStore];
  if (agentId) result = result.filter((p) => p.agentId === Number(agentId));
  if (customerId) result = result.filter((p) => p.customerId === Number(customerId));
  if (method) result = result.filter((p) => p.method === method);
  if (req.user?.role === "SALES_AGENT" && req.user.agentId) {
    result = result.filter((p) => p.agentId === req.user!.agentId);
  }
  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const total = result.length;
  const p = Number(page);
  const l = Number(limit);
  const items = result.slice((p - 1) * l, p * l);
  res.json({ items, total, page: p, limit: l, totalPages: Math.ceil(total / l) });
});

router.post("/", authenticate, (req: AuthRequest, res: Response) => {
  const { customerId, customerName, amount, method, note, orderId } = req.body;
  const agentId = req.user?.agentId || req.body.agentId;
  const newPayment = {
    id: paymentsStore.length + 1,
    orderId,
    customerId,
    customerName,
    agentId,
    amount,
    method,
    note,
    createdAt: new Date().toISOString(),
  };
  paymentsStore.push(newPayment);
  res.status(201).json(newPayment);
});

router.get("/debts", authenticate, (_req: AuthRequest, res: Response) => {
  const debts = customers
    .filter((c) => c.debt > 0)
    .map((c) => ({
      customerId: c.id,
      customerName: c.companyName,
      phone: c.phone,
      agentId: c.agentId,
      totalDebt: c.debt,
      status: c.debt > 5_000_000 ? "CRITICAL" : c.debt > 2_000_000 ? "OVERDUE" : "CURRENT",
    }))
    .sort((a, b) => b.totalDebt - a.totalDebt);
  res.json(debts);
});

export default router;
