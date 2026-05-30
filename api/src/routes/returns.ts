import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

function mapReturn(r: any) {
  return {
    id: r.id,
    returnNo: r.returnNo,
    orderId: r.orderId ?? null,
    customerId: r.customerId,
    customerName: r.customer?.companyName ?? "",
    agentId: r.agentId,
    agentName: r.agent?.fullName ?? "",
    status: r.status,
    reason: r.reason,
    total: Number(r.total),
    note: r.note ?? null,
    itemCount: r.items?.length ?? 0,
    items: (r.items ?? []).map((i: any) => ({
      id: i.id,
      productId: i.productId,
      productName: i.product?.name ?? "",
      quantity: i.quantity,
      price: Number(i.price),
      total: Number(i.total),
    })),
    createdAt: r.createdAt?.toISOString(),
    updatedAt: r.updatedAt?.toISOString(),
  };
}

const returnInclude = {
  customer: { select: { companyName: true } },
  agent: { select: { fullName: true } },
  items: { include: { product: { select: { name: true } } } },
};

// GET / - list returns
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 20, status, agentId, from, to } = req.query;
  const p = Number(page); const l = Number(limit);

  const where: any = {};
  if (status) where.status = status;
  if (agentId) where.agentId = Number(agentId);
  if (req.user?.role === "SALES_AGENT" && req.user.agentId) {
    where.agentId = req.user.agentId;
  }
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(String(from));
    if (to) { const toDate = new Date(String(to)); toDate.setHours(23, 59, 59, 999); where.createdAt.lte = toDate; }
  }

  const [items, total] = await Promise.all([
    prisma.returnOrder.findMany({
      where,
      include: returnInclude,
      orderBy: { createdAt: "desc" },
      skip: (p - 1) * l,
      take: l,
    }),
    prisma.returnOrder.count({ where }),
  ]);

  return res.json({ items: items.map(mapReturn), total, page: p, limit: l, totalPages: Math.ceil(total / l) });
});

// GET /:id - return detail
router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const returnOrder = await prisma.returnOrder.findUnique({
    where: { id: Number(req.params.id) },
    include: returnInclude,
  });
  if (!returnOrder) return res.status(404).json({ error: "Return order not found" });
  return res.json(mapReturn(returnOrder));
});

// POST / - create return order
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  const { orderId, customerId, agentId, reason, items, note } = req.body;
  if (!customerId || !reason || !items?.length) {
    return res.status(400).json({ error: "customerId, reason, items required" });
  }

  const resolvedAgentId = agentId || req.user?.agentId;
  if (!resolvedAgentId) return res.status(400).json({ error: "agentId required" });

  const total = items.reduce((s: number, i: { total: number }) => s + Number(i.total), 0);

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const count = await prisma.returnOrder.count();
  const returnNo = `RTN-${dateStr}-${String(count + 1).padStart(3, "0")}`;

  const returnOrder = await prisma.returnOrder.create({
    data: {
      returnNo,
      orderId: orderId ? Number(orderId) : null,
      customerId: Number(customerId),
      agentId: Number(resolvedAgentId),
      reason,
      total,
      note,
      items: {
        create: items.map((i: any) => ({
          productId: Number(i.productId),
          quantity: Number(i.quantity),
          price: Number(i.price),
          total: Number(i.total),
        })),
      },
    },
    include: returnInclude,
  });

  return res.status(201).json(mapReturn(returnOrder));
});

// PUT /:id/approve - approve return
router.put("/:id/approve", authenticate, async (req: AuthRequest, res: Response) => {
  const returnOrder = await prisma.returnOrder.findUnique({
    where: { id: Number(req.params.id) },
    include: { items: true },
  });
  if (!returnOrder) return res.status(404).json({ error: "Return order not found" });
  if (returnOrder.status !== "PENDING") {
    return res.status(400).json({ error: "Only PENDING returns can be approved" });
  }

  // Increase stock for each returned item
  await prisma.$transaction([
    prisma.returnOrder.update({
      where: { id: Number(req.params.id) },
      data: { status: "APPROVED" },
    }),
    ...returnOrder.items.map((item) =>
      prisma.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      })
    ),
  ]);

  const updated = await prisma.returnOrder.findUnique({
    where: { id: Number(req.params.id) },
    include: returnInclude,
  });
  return res.json(mapReturn(updated));
});

// PUT /:id/reject - reject return
router.put("/:id/reject", authenticate, async (req: AuthRequest, res: Response) => {
  const updated = await prisma.returnOrder.update({
    where: { id: Number(req.params.id) },
    data: { status: "REJECTED" },
    include: returnInclude,
  });
  return res.json(mapReturn(updated));
});

// PUT /:id/complete - complete return
router.put("/:id/complete", authenticate, async (req: AuthRequest, res: Response) => {
  const updated = await prisma.returnOrder.update({
    where: { id: Number(req.params.id) },
    data: { status: "COMPLETED" },
    include: returnInclude,
  });
  return res.json(mapReturn(updated));
});

export default router;
