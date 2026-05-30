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
  try {
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
  } catch (err: any) {
    console.error("Order list failed:", err);
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: Number(req.params.id) }, include: orderInclude });
    if (!order) return res.status(404).json({ error: "Order not found" });
    return res.json(mapOrder(order));
  } catch (err: any) {
    console.error("Order read failed:", err);
    return res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, items, discount = 0, note } = req.body;
    const agentId = req.user?.agentId || req.body.agentId;

    if (!customerId) return res.status(400).json({ error: "customerId required" });
    if (!agentId) return res.status(400).json({ error: "agentId required" });
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Kamida bitta mahsulot tanlang" });
    }

    // Validate that customer and agent exist (clearer error than a raw FK failure)
    const [customer, agent] = await Promise.all([
      prisma.customer.findUnique({ where: { id: Number(customerId) } }),
      prisma.agent.findUnique({ where: { id: Number(agentId) } }),
    ]);
    if (!customer) return res.status(400).json({ error: "Mijoz topilmadi" });
    if (!agent) return res.status(400).json({ error: "Agent topilmadi" });

    const subtotal = items.reduce(
      (s: number, i: { total: number }) => s + Number(i.total),
      0
    );
    const total = subtotal - Number(discount || 0);
    const year = new Date().getFullYear();

    // Collision-safe order number: take the highest existing number for this year.
    const last = await prisma.order.findFirst({
      where: { orderNo: { startsWith: `ORD-${year}-` } },
      orderBy: { orderNo: "desc" },
      select: { orderNo: true },
    });
    const lastSeq = last ? parseInt(last.orderNo.split("-").pop() || "0", 10) : 0;
    const orderNo = `ORD-${year}-${String(lastSeq + 1).padStart(4, "0")}`;

    const order = await prisma.order.create({
      data: {
        orderNo,
        customerId: Number(customerId),
        agentId: Number(agentId),
        status: "DRAFT",
        subtotal,
        discount: Number(discount || 0),
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
      include: orderInclude,
    });
    return res.status(201).json(mapOrder(order));
  } catch (err: any) {
    console.error("Order create failed:", err);
    return res
      .status(500)
      .json({ error: err?.message || "Buyurtmani saqlashda xatolik yuz berdi" });
  }
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
