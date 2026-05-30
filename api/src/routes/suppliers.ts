import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

function mapSupplier(s: any) {
  return {
    id: s.id,
    name: s.name,
    contactPerson: s.contactPerson,
    phone: s.phone,
    email: s.email ?? null,
    address: s.address ?? null,
    taxId: s.taxId ?? null,
    balance: Number(s.balance),
    isActive: s.isActive,
    paymentCount: s._count?.payments ?? 0,
    createdAt: s.createdAt?.toISOString(),
    updatedAt: s.updatedAt?.toISOString(),
  };
}

function mapPayment(p: any) {
  return {
    id: p.id,
    supplierId: p.supplierId,
    amount: Number(p.amount),
    method: p.method,
    note: p.note ?? null,
    createdAt: p.createdAt?.toISOString(),
  };
}

// GET / - list all suppliers
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  const { search, isActive } = req.query;
  const where: any = {};
  if (isActive !== undefined) where.isActive = isActive === "true";
  if (search) {
    where.OR = [
      { name: { contains: String(search), mode: "insensitive" } },
      { contactPerson: { contains: String(search), mode: "insensitive" } },
      { phone: { contains: String(search), mode: "insensitive" } },
    ];
  }

  const suppliers = await prisma.supplier.findMany({
    where,
    include: { _count: { select: { payments: true } } },
    orderBy: { createdAt: "desc" },
  });

  res.json({ items: suppliers.map(mapSupplier), total: suppliers.length });
});

// GET /:id - supplier detail
router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const supplier = await prisma.supplier.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      _count: { select: { payments: true } },
      payments: { orderBy: { createdAt: "desc" }, take: 20 },
      stockMovements: {
        include: { product: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
  if (!supplier) return res.status(404).json({ error: "Supplier not found" });

  return res.json({
    ...mapSupplier(supplier),
    payments: (supplier as any).payments.map(mapPayment),
    stockMovements: ((supplier as any).stockMovements ?? []).map((m: any) => ({
      id: m.id,
      type: m.type,
      productId: m.productId,
      productName: m.product?.name ?? "",
      quantity: m.quantity,
      unitCost: m.unitCost !== null ? Number(m.unitCost) : null,
      totalCost: m.totalCost !== null ? Number(m.totalCost) : null,
      createdAt: m.createdAt?.toISOString(),
    })),
  });
});

// POST / - create supplier
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  const { name, contactPerson, phone, email, address, taxId } = req.body;
  if (!name || !contactPerson || !phone) {
    return res.status(400).json({ error: "name, contactPerson, phone required" });
  }
  const supplier = await prisma.supplier.create({
    data: { name, contactPerson, phone, email, address, taxId },
    include: { _count: { select: { payments: true } } },
  });
  return res.status(201).json(mapSupplier(supplier));
});

// PUT /:id - update supplier
router.put("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const { name, contactPerson, phone, email, address, taxId, isActive } = req.body;
  const supplier = await prisma.supplier.update({
    where: { id: Number(req.params.id) },
    data: { name, contactPerson, phone, email, address, taxId, isActive },
    include: { _count: { select: { payments: true } } },
  });
  return res.json(mapSupplier(supplier));
});

// DELETE /:id - soft delete
router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  await prisma.supplier.update({
    where: { id: Number(req.params.id) },
    data: { isActive: false },
  });
  return res.json({ success: true });
});

// GET /:id/payments - payment history
router.get("/:id/payments", authenticate, async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 20 } = req.query;
  const p = Number(page); const l = Number(limit);
  const supplierId = Number(req.params.id);

  const [payments, total] = await Promise.all([
    prisma.supplierPayment.findMany({
      where: { supplierId },
      orderBy: { createdAt: "desc" },
      skip: (p - 1) * l,
      take: l,
    }),
    prisma.supplierPayment.count({ where: { supplierId } }),
  ]);

  return res.json({ items: payments.map(mapPayment), total, page: p, limit: l });
});

// POST /:id/payments - add payment
router.post("/:id/payments", authenticate, async (req: AuthRequest, res: Response) => {
  const supplierId = Number(req.params.id);
  const { amount, method, note } = req.body;
  if (!amount || !method) return res.status(400).json({ error: "amount, method required" });

  const [payment] = await prisma.$transaction([
    prisma.supplierPayment.create({
      data: { supplierId, amount: Number(amount), method, note },
    }),
    prisma.supplier.update({
      where: { id: supplierId },
      data: { balance: { decrement: Number(amount) } },
    }),
  ]);

  return res.status(201).json(mapPayment(payment));
});

export default router;
