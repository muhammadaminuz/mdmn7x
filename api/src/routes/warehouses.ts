import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

router.get("/", authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: {
        _count: { select: { products: true } },
        products: { select: { price: true, wholesalePrice: true, stock: true } },
      },
      orderBy: { name: "asc" },
    });

    res.json(warehouses.map((w) => {
      const totalValue = w.products.reduce((s, p) => s + Number(p.wholesalePrice) * p.stock, 0);
      return {
        id: w.id,
        name: w.name,
        location: w.location,
        manager: w.manager,
        phone: w.phone,
        isActive: w.isActive,
        totalProducts: w._count.products,
        totalValue,
        createdAt: w.createdAt?.toISOString(),
      };
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        products: {
          include: { warehouse: { select: { name: true } } },
          orderBy: { name: "asc" },
        },
      },
    });
    if (!warehouse) return res.status(404).json({ error: "Warehouse not found" });

    const warehouseProducts = warehouse.products.map((p) => ({
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
      image: p.image,
      isActive: p.isActive,
      expiryDate: p.expiryDate?.toISOString() ?? null,
      batchNo: p.batchNo ?? null,
    }));

    const lowStockCount = warehouseProducts.filter((p) => p.stock <= p.minStock).length;
    const totalValue = warehouseProducts.reduce((s, p) => s + p.wholesalePrice * p.stock, 0);

    return res.json({
      id: warehouse.id,
      name: warehouse.name,
      location: warehouse.location,
      manager: warehouse.manager,
      phone: warehouse.phone,
      isActive: warehouse.isActive,
      createdAt: warehouse.createdAt?.toISOString(),
      products: warehouseProducts,
      lowStockCount,
      totalValue,
      totalProducts: warehouseProducts.length,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
