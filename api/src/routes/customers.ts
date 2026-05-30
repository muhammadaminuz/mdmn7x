import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

function mapCustomer(c: any) {
  return {
    id: c.id, companyName: c.companyName, ownerName: c.ownerName, phone: c.phone,
    region: c.region, district: c.district, address: c.address,
    latitude: c.latitude, longitude: c.longitude,
    debt: Number(c.debt), balance: Number(c.balance),
    status: c.status, agentId: c.agentId, territoryId: c.territoryId,
    createdAt: c.createdAt?.toISOString(),
    lastVisit: c.lastVisit?.toISOString() ?? null,
  };
}

router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 20, search, status, agentId, territoryId } = req.query;
  const p = Number(page); const l = Number(limit);
  const where: any = {};
  if (status) where.status = status;
  if (agentId) where.agentId = Number(agentId);
  if (territoryId) where.territoryId = Number(territoryId);
  if (search) {
    where.OR = [
      { companyName: { contains: String(search), mode: "insensitive" } },
      { ownerName: { contains: String(search), mode: "insensitive" } },
      { phone: { contains: String(search) } },
    ];
  }
  if (req.user?.role === "SALES_AGENT" && req.user.agentId) where.agentId = req.user.agentId;

  const [items, total] = await Promise.all([
    prisma.customer.findMany({ where, skip: (p - 1) * l, take: l, orderBy: { companyName: "asc" } }),
    prisma.customer.count({ where }),
  ]);
  res.json({ items: items.map(mapCustomer), total, page: p, limit: l, totalPages: Math.ceil(total / l) });
});

router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const customer = await prisma.customer.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      orders: { orderBy: { createdAt: "desc" }, take: 10, include: { items: { include: { product: { select: { name: true } } } } } },
      payments: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  return res.json({
    ...mapCustomer(customer),
    orders: customer.orders.map((o: any) => ({
      id: o.id, orderNo: o.orderNo, status: o.status,
      total: Number(o.total), createdAt: o.createdAt?.toISOString(),
      items: o.items.map((i: any) => ({ productId: i.productId, productName: i.product?.name ?? "", quantity: i.quantity, price: Number(i.price), total: Number(i.total) })),
    })),
    payments: customer.payments.map((p: any) => ({ id: p.id, amount: Number(p.amount), method: p.method, note: p.note, createdAt: p.createdAt?.toISOString() })),
  });
});

router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  const customer = await prisma.customer.create({ data: req.body });
  res.status(201).json(mapCustomer(customer));
});

router.put("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const customer = await prisma.customer.update({ where: { id: Number(req.params.id) }, data: req.body });
  return res.json(mapCustomer(customer));
});

export default router;
