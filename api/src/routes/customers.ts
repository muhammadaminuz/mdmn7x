import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { customers } from "../data/customers";
import { ordersStore } from "../data/orders";
import { paymentsStore } from "../data/payments";

const router = Router();
let customersStore = [...customers];

router.get("/", authenticate, (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 20, search, status, agentId, territoryId } = req.query;
  let result = [...customersStore];
  if (search) result = result.filter((c) => c.companyName.toLowerCase().includes(String(search).toLowerCase()) || c.ownerName.toLowerCase().includes(String(search).toLowerCase()) || c.phone.includes(String(search)));
  if (status) result = result.filter((c) => c.status === status);
  if (agentId) result = result.filter((c) => c.agentId === Number(agentId));
  if (territoryId) result = result.filter((c) => c.territoryId === Number(territoryId));
  if (req.user?.role === "SALES_AGENT" && req.user.agentId) {
    result = result.filter((c) => c.agentId === req.user!.agentId);
  }
  const total = result.length;
  const p = Number(page);
  const l = Number(limit);
  const items = result.slice((p - 1) * l, p * l);
  res.json({ items, total, page: p, limit: l, totalPages: Math.ceil(total / l) });
});

router.get("/:id", authenticate, (req: AuthRequest, res: Response) => {
  const customer = customersStore.find((c) => c.id === Number(req.params.id));
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  const orders = ordersStore.filter((o) => o.customerId === customer.id).slice(0, 10);
  const payments = paymentsStore.filter((p) => p.customerId === customer.id).slice(0, 10);
  return res.json({ ...customer, orders, payments });
});

router.post("/", authenticate, (req: AuthRequest, res: Response) => {
  const newCustomer = { ...req.body, id: customersStore.length + 1, createdAt: new Date().toISOString() };
  customersStore.push(newCustomer);
  res.status(201).json(newCustomer);
});

router.put("/:id", authenticate, (req: AuthRequest, res: Response) => {
  const idx = customersStore.findIndex((c) => c.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "Customer not found" });
  customersStore[idx] = { ...customersStore[idx], ...req.body };
  return res.json(customersStore[idx]);
});

export default router;
