import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

function mapMovement(m: any) {
  return {
    id: m.id,
    type: m.type,
    productId: m.productId,
    productName: m.product?.name ?? "",
    fromWarehouseId: m.fromWarehouseId ?? null,
    fromWarehouseName: m.fromWarehouse?.name ?? null,
    toWarehouseId: m.toWarehouseId ?? null,
    toWarehouseName: m.toWarehouse?.name ?? null,
    supplierId: m.supplierId ?? null,
    supplierName: m.supplier?.name ?? null,
    quantity: m.quantity,
    unitCost: m.unitCost !== null ? Number(m.unitCost) : null,
    totalCost: m.totalCost !== null ? Number(m.totalCost) : null,
    batchNo: m.batchNo ?? null,
    expiryDate: m.expiryDate?.toISOString() ?? null,
    note: m.note ?? null,
    createdById: m.createdById ?? null,
    createdByName: m.createdBy?.fullName ?? null,
    createdAt: m.createdAt?.toISOString(),
  };
}

const movementInclude = {
  product: { select: { name: true } },
  fromWarehouse: { select: { name: true } },
  toWarehouse: { select: { name: true } },
  supplier: { select: { name: true } },
  createdBy: { select: { fullName: true } },
};

// GET / - list all movements
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 20, type, warehouseId, productId, from, to } = req.query;
  const p = Number(page); const l = Number(limit);

  const where: any = {};
  if (type) where.type = type;
  if (productId) where.productId = Number(productId);
  if (warehouseId) {
    where.OR = [
      { fromWarehouseId: Number(warehouseId) },
      { toWarehouseId: Number(warehouseId) },
    ];
  }
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(String(from));
    if (to) { const toDate = new Date(String(to)); toDate.setHours(23, 59, 59, 999); where.createdAt.lte = toDate; }
  }

  const [items, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: movementInclude,
      orderBy: { createdAt: "desc" },
      skip: (p - 1) * l,
      take: l,
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return res.json({ items: items.map(mapMovement), total, page: p, limit: l, totalPages: Math.ceil(total / l) });
});

// GET /:id - movement detail
router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const movement = await prisma.stockMovement.findUnique({
    where: { id: Number(req.params.id) },
    include: movementInclude,
  });
  if (!movement) return res.status(404).json({ error: "Movement not found" });
  return res.json(mapMovement(movement));
});

// POST /incoming - create INCOMING movement
router.post("/incoming", authenticate, async (req: AuthRequest, res: Response) => {
  const { productId, toWarehouseId, supplierId, quantity, unitCost, batchNo, expiryDate, note } = req.body;
  if (!productId || !toWarehouseId || !quantity) {
    return res.status(400).json({ error: "productId, toWarehouseId, quantity required" });
  }

  const qty = Number(quantity);
  const cost = unitCost ? Number(unitCost) : null;
  const totalCost = cost ? cost * qty : null;

  const [movement] = await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        type: "INCOMING",
        productId: Number(productId),
        toWarehouseId: Number(toWarehouseId),
        supplierId: supplierId ? Number(supplierId) : null,
        quantity: qty,
        unitCost: cost,
        totalCost,
        batchNo: batchNo ?? null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        note: note ?? null,
        createdById: req.user?.id ?? null,
      },
      include: movementInclude,
    }),
    prisma.product.update({
      where: { id: Number(productId) },
      data: { stock: { increment: qty }, warehouseId: Number(toWarehouseId) },
    }),
  ]);

  // Update supplier balance if provided
  if (supplierId && totalCost) {
    await prisma.supplier.update({
      where: { id: Number(supplierId) },
      data: { balance: { increment: totalCost } },
    });
  }

  return res.status(201).json(mapMovement(movement));
});

// POST /outgoing - create OUTGOING movement
router.post("/outgoing", authenticate, async (req: AuthRequest, res: Response) => {
  const { productId, fromWarehouseId, quantity, note } = req.body;
  if (!productId || !fromWarehouseId || !quantity) {
    return res.status(400).json({ error: "productId, fromWarehouseId, quantity required" });
  }

  const qty = Number(quantity);

  // Check sufficient stock
  const product = await prisma.product.findUnique({ where: { id: Number(productId) } });
  if (!product) return res.status(404).json({ error: "Product not found" });
  if (product.stock < qty) return res.status(400).json({ error: "Insufficient stock" });

  const [movement] = await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        type: "OUTGOING",
        productId: Number(productId),
        fromWarehouseId: Number(fromWarehouseId),
        quantity: qty,
        note: note ?? null,
        createdById: req.user?.id ?? null,
      },
      include: movementInclude,
    }),
    prisma.product.update({
      where: { id: Number(productId) },
      data: { stock: { decrement: qty } },
    }),
  ]);

  return res.status(201).json(mapMovement(movement));
});

// POST /transfer - create TRANSFER between warehouses
router.post("/transfer", authenticate, async (req: AuthRequest, res: Response) => {
  const { productId, fromWarehouseId, toWarehouseId, quantity, note } = req.body;
  if (!productId || !fromWarehouseId || !toWarehouseId || !quantity) {
    return res.status(400).json({ error: "productId, fromWarehouseId, toWarehouseId, quantity required" });
  }

  const qty = Number(quantity);

  const product = await prisma.product.findUnique({ where: { id: Number(productId) } });
  if (!product) return res.status(404).json({ error: "Product not found" });
  if (product.stock < qty) return res.status(400).json({ error: "Insufficient stock" });

  const [movement] = await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        type: "TRANSFER",
        productId: Number(productId),
        fromWarehouseId: Number(fromWarehouseId),
        toWarehouseId: Number(toWarehouseId),
        quantity: qty,
        note: note ?? null,
        createdById: req.user?.id ?? null,
      },
      include: movementInclude,
    }),
    prisma.product.update({
      where: { id: Number(productId) },
      data: { warehouseId: Number(toWarehouseId) },
    }),
  ]);

  return res.status(201).json(mapMovement(movement));
});

// POST /adjustment - stock adjustment
router.post("/adjustment", authenticate, async (req: AuthRequest, res: Response) => {
  const { productId, warehouseId, quantity, note } = req.body;
  if (!productId || !warehouseId || quantity === undefined) {
    return res.status(400).json({ error: "productId, warehouseId, quantity required" });
  }

  const newQty = Number(quantity);

  const product = await prisma.product.findUnique({ where: { id: Number(productId) } });
  if (!product) return res.status(404).json({ error: "Product not found" });

  const diff = newQty - product.stock;

  const [movement] = await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        type: "ADJUSTMENT",
        productId: Number(productId),
        toWarehouseId: Number(warehouseId),
        quantity: Math.abs(diff),
        note: note ?? `Adjustment: ${product.stock} → ${newQty}`,
        createdById: req.user?.id ?? null,
      },
      include: movementInclude,
    }),
    prisma.product.update({
      where: { id: Number(productId) },
      data: { stock: newQty, warehouseId: Number(warehouseId) },
    }),
  ]);

  return res.status(201).json(mapMovement(movement));
});

export default router;
