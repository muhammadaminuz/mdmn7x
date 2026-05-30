import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

function mapOrder(o: any) {
  return {
    id: o.id,
    orderNo: o.orderNo,
    customerId: o.customerId,
    customerName: o.customer?.companyName ?? "",
    agentId: o.agentId,
    agentName: o.agent?.fullName ?? "",
    status: o.status,
    items: (o.items ?? []).map((i: any) => ({
      productId: i.productId,
      productName: i.product?.name ?? "",
      quantity: i.quantity,
      price: Number(i.price),
      total: Number(i.total),
    })),
    subtotal: Number(o.subtotal),
    discount: Number(o.discount),
    total: Number(o.total),
    note: o.note,
    createdAt: o.createdAt?.toISOString(),
    updatedAt: o.updatedAt?.toISOString(),
    deliveredAt: o.deliveredAt?.toISOString() ?? null,
  };
}

const orderInclude = {
  customer: { select: { companyName: true } },
  agent: { select: { fullName: true } },
  items: { include: { product: { select: { name: true } } } },
};

router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 10, status, agentId, customerId, search, from, to } = req.query;
  const p = Number(page); const l = Number(limit);

  const where: any = {};
  if (status) where.status = status;
  if (agentId) where.agentId = Number(agentId);
  if (customerId) where.customerId = Number(customerId);
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(String(from));
    if (to) { const toDate = new Date(String(to)); toDate.setHours(23, 59, 59, 999); where.createdAt.lte = toDate; }
  }
  if (search) {
    where.OR = [
      { orderNo: { contains: String(search), mode: "insensitive" } },
      { customer: { companyName: { contains: String(search), mode: "insensitive" } } },
    ];
  }
  if (req.user?.role === "SALES_AGENT" && req.user.agentId) {
    where.agentId = req.user.agentId;
  }

  const [items, total] = await Promise.all([
    prisma.order.findMany({ where, include: orderInclude, orderBy: { createdAt: "desc" }, skip: (p - 1) * l, take: l }),
    prisma.order.count({ where }),
  ]);

  res.json({ items: items.map(mapOrder), total, page: p, limit: l, totalPages: Math.ceil(total / l) });
});

router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const order = await prisma.order.findUnique({ where: { id: Number(req.params.id) }, include: orderInclude });
  if (!order) return res.status(404).json({ error: "Order not found" });
  return res.json(mapOrder(order));
});

router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  const { customerId, items, discount = 0, note } = req.body;
  const agentId = req.user?.agentId || req.body.agentId;
  if (!agentId) return res.status(400).json({ error: "agentId required" });

  const subtotal = items.reduce((s: number, i: { total: number }) => s + i.total, 0);
  const total = subtotal - discount;
  const count = await prisma.order.count();
  const year = new Date().getFullYear();

  const order = await prisma.order.create({
    data: {
      orderNo: `ORD-${year}-${String(count + 1).padStart(4, "0")}`,
      customerId: Number(customerId),
      agentId: Number(agentId),
      status: "DRAFT",
      subtotal,
      discount,
      total,
      note,
      items: { create: items.map((i: any) => ({ productId: Number(i.productId), quantity: Number(i.quantity), price: Number(i.price), total: Number(i.total) })) },
    },
    include: orderInclude,
  });
  res.status(201).json(mapOrder(order));
});

router.put("/:id/status", authenticate, async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const order = await prisma.order.update({
    where: { id: Number(req.params.id) },
    data: { status, updatedAt: new Date(), ...(status === "DELIVERED" ? { deliveredAt: new Date() } : {}) },
    include: orderInclude,
  });
  return res.json(mapOrder(order));
});

export default router;
