import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { products } from "../data/products";

const router = Router();
let productsStore = [...products];

router.get("/", authenticate, (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 20, search, category, warehouseId, lowStock } = req.query;
  let result = [...productsStore];
  if (search) result = result.filter((p) => p.name.toLowerCase().includes(String(search).toLowerCase()) || p.sku.includes(String(search)) || p.barcode.includes(String(search)));
  if (category) result = result.filter((p) => p.category === category);
  if (warehouseId) result = result.filter((p) => p.warehouseId === Number(warehouseId));
  if (lowStock === "true") result = result.filter((p) => p.stock <= p.minStock);
  const total = result.length;
  const p = Number(page);
  const l = Number(limit);
  const items = result.slice((p - 1) * l, p * l);
  res.json({ items, total, page: p, limit: l, totalPages: Math.ceil(total / l) });
});

router.get("/categories", authenticate, (_req: AuthRequest, res: Response) => {
  const cats = [...new Set(productsStore.map((p) => p.category))];
  res.json(cats);
});

router.get("/barcode/:barcode", authenticate, (req: AuthRequest, res: Response) => {
  const product = productsStore.find((p) => p.barcode === req.params.barcode);
  if (!product) return res.status(404).json({ error: "Product not found" });
  return res.json(product);
});

router.get("/:id", authenticate, (req: AuthRequest, res: Response) => {
  const product = productsStore.find((p) => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ error: "Product not found" });
  return res.json(product);
});

router.post("/", authenticate, (req: AuthRequest, res: Response) => {
  const newProduct = { ...req.body, id: productsStore.length + 1 };
  productsStore.push(newProduct);
  res.status(201).json(newProduct);
});

router.put("/:id", authenticate, (req: AuthRequest, res: Response) => {
  const idx = productsStore.findIndex((p) => p.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "Product not found" });
  productsStore[idx] = { ...productsStore[idx], ...req.body };
  return res.json(productsStore[idx]);
});

export default router;
