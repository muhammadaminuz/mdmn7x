import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

function mapProduct(p: any) {
  return {
    id: p.id,
    sku: p.sku,
    barcode: p.barcode,
    name: p.name,
    category: p.category,
    price: Number(p.price),
    wholesalePrice: Number(p.wholesalePrice),
    stock: p.stock,
    minStock: p.minStock,
    warehouseId: p.warehouseId,
    warehouseName: p.warehouse?.name ?? "",
    image: p.image,
    isActive: p.isActive,
    expiryDate: p.expiryDate?.toISOString() ?? null,
    batchNo: p.batchNo ?? null,
    createdAt: p.createdAt?.toISOString(),
  };
}

router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, search, category, warehouseId, lowStock } = req.query;
    const p = Number(page); const l = Number(limit);
    const where: any = {};
    if (category) where.category = category;
    if (warehouseId) where.warehouseId = Number(warehouseId);
    if (lowStock === "true") where.stock = { lte: prisma.product.fields.minStock };
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: "insensitive" } },
        { sku: { contains: String(search), mode: "insensitive" } },
        { barcode: { contains: String(search) } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { warehouse: { select: { name: true } } },
        skip: (p - 1) * l,
        take: l,
        orderBy: { name: "asc" },
      }),
      prisma.product.count({ where }),
    ]);

    // Filter lowStock in JS since it requires comparing two columns
    let result = items.map(mapProduct);
    if (lowStock === "true") {
      result = result.filter((prod) => prod.stock <= prod.minStock);
    }

    res.json({ items: result, total: lowStock === "true" ? result.length : total, page: p, limit: l, totalPages: Math.ceil((lowStock === "true" ? result.length : total) / l) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/categories", authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const products = await prisma.product.findMany({ select: { category: true }, distinct: ["category"] });
    res.json(products.map((p) => p.category));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/barcode/:barcode", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const product = await prisma.product.findUnique({
      where: { barcode: req.params.barcode },
      include: { warehouse: { select: { name: true } } },
    });
    if (!product) return res.status(404).json({ error: "Product not found" });
    return res.json(mapProduct(product));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: Number(req.params.id) },
      include: { warehouse: { select: { name: true } } },
    });
    if (!product) return res.status(404).json({ error: "Product not found" });
    return res.json(mapProduct(product));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const product = await prisma.product.create({
      data: {
        ...req.body,
        expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : undefined,
      },
      include: { warehouse: { select: { name: true } } },
    });
    res.status(201).json(mapProduct(product));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const product = await prisma.product.update({
      where: { id: Number(req.params.id) },
      data: {
        ...req.body,
        expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : undefined,
      },
      include: { warehouse: { select: { name: true } } },
    });
    return res.json(mapProduct(product));
  } catch (err: any) {
    if (err?.code === "P2025") return res.status(404).json({ error: "Product not found" });
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
