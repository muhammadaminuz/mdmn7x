import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { warehouses } from "../data/warehouses";
import { products } from "../data/products";

const router = Router();

router.get("/", authenticate, (_req: AuthRequest, res: Response) => {
  res.json(warehouses);
});

router.get("/:id", authenticate, (req: AuthRequest, res: Response) => {
  const warehouse = warehouses.find((w) => w.id === Number(req.params.id));
  if (!warehouse) return res.status(404).json({ error: "Warehouse not found" });
  const warehouseProducts = products.filter((p) => p.warehouseId === warehouse.id);
  const lowStockItems = warehouseProducts.filter((p) => p.stock <= p.minStock);
  return res.json({ ...warehouse, products: warehouseProducts, lowStockCount: lowStockItems.length });
});

export default router;
