import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { customers } from "../data/customers";
import { ordersStore } from "../data/orders";
import { paymentsStore } from "../data/payments";

const router = Router();

router.get("/summary", authenticate, (_req: AuthRequest, res: Response) => {
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.status === "ACTIVE").length;
  const inactiveCustomers = customers.filter((c) => c.status === "INACTIVE").length;
  const blockedCustomers = customers.filter((c) => c.status === "BLOCKED").length;
  const totalDebt = customers.reduce((s, c) => s + c.debt, 0);
  const totalBalance = customers.reduce((s, c) => s + c.balance, 0);
  const criticalDebtors = customers.filter((c) => c.debt > 5_000_000).length;
  res.json({ totalCustomers, activeCustomers, inactiveCustomers, blockedCustomers, totalDebt, totalBalance, criticalDebtors });
});

router.get("/top-customers", authenticate, (_req: AuthRequest, res: Response) => {
  const customerRevenue = customers.map((c) => {
    const revenue = ordersStore.filter((o) => o.customerId === c.id && o.status === "DELIVERED").reduce((s, o) => s + o.total, 0);
    const orders = ordersStore.filter((o) => o.customerId === c.id).length;
    return { ...c, revenue, orders };
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  res.json(customerRevenue);
});

router.get("/debt-aging", authenticate, (_req: AuthRequest, res: Response) => {
  const aging = {
    "0-30 days": customers.filter((c) => c.debt > 0 && c.debt <= 1_000_000).length,
    "31-60 days": customers.filter((c) => c.debt > 1_000_000 && c.debt <= 3_000_000).length,
    "61-90 days": customers.filter((c) => c.debt > 3_000_000 && c.debt <= 5_000_000).length,
    "90+ days": customers.filter((c) => c.debt > 5_000_000).length,
  };
  res.json(aging);
});

export default router;
