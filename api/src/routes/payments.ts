import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

function mapPayment(p: any) {
  return {
    id: p.id, orderId: p.orderId,
    customerId: p.customerId,
    customerName: p.customer?.companyName ?? "",
    agentId: p.agentId,
    amount: Number(p.amount),
    method: p.method, note: p.note,
    createdAt: p.createdAt?.toISOString(),
  };
}

router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 20, agentId, customerId, method } = req.query;
  const p = Number(page); const l = Number(limit);
  const where: any = {};
  if (agentId) where.agentId = Number(agentId);
  if (customerId) where.customerId = Number(customerId);
  if (method) where.method = method;
  if (req.user?.role === "SALES_AGENT" && req.user.agentId) where.agentId = req.user.agentId;

  const [items, total] = await Promise.all([
    prisma.payment.findMany({ where, include: { customer: { select: { companyName: true } } }, orderBy: { createdAt: "desc" }, skip: (p - 1) * l, take: l }),
    prisma.payment.count({ where }),
  ]);
  res.json({ items: items.map(mapPayment), total, page: p, limit: l, totalPages: Math.ceil(total / l) });
});

router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  const { customerId, amount, method, note, orderId } = req.body;
  const agentId = req.user?.agentId || req.body.agentId;
  const payment = await prisma.payment.create({
    data: { orderId: orderId ? Number(orderId) : undefined, customerId: Number(customerId), agentId: Number(agentId), amount: Number(amount), method, note },
    include: { customer: { select: { companyName: true } } },
  });
  res.status(201).json(mapPayment(payment));
});

router.get("/debts", authenticate, async (_req: AuthRequest, res: Response) => {
  const customers = await prisma.customer.findMany({
    where: { debt: { gt: 0 } },
    include: { agent: { select: { id: true, fullName: true } } },
    orderBy: { debt: "desc" },
  });
  const debts = customers.map(c => ({
    customerId: c.id,
    customerName: c.companyName,
    phone: c.phone,
    agentId: c.agentId,
    agentName: c.agent?.fullName ?? "",
    totalDebt: Number(c.debt),
    status: Number(c.debt) > 5_000_000 ? "CRITICAL" : Number(c.debt) > 2_000_000 ? "OVERDUE" : "CURRENT",
  }));
  res.json(debts);
});

export default router;
