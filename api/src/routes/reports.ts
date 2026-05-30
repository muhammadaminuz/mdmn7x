import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { ordersStore } from "../data/orders";
import { paymentsStore } from "../data/payments";
import { customers } from "../data/customers";
import { agents } from "../data/agents";
import { monthlySales } from "../data/analytics";

const router = Router();

router.get("/sales", authenticate, (_req: AuthRequest, res: Response) => {
  const totalRevenue = ordersStore.filter((o) => o.status === "DELIVERED").reduce((s, o) => s + o.total, 0);
  const totalOrders = ordersStore.length;
  const deliveredOrders = ordersStore.filter((o) => o.status === "DELIVERED").length;
  const cancelledOrders = ordersStore.filter((o) => o.status === "CANCELLED").length;
  res.json({ totalRevenue, totalOrders, deliveredOrders, cancelledOrders, monthlySales });
});

router.get("/agents", authenticate, (_req: AuthRequest, res: Response) => {
  const agentReports = agents.map((a) => {
    const agentOrders = ordersStore.filter((o) => o.agentId === a.id);
    const revenue = agentOrders.filter((o) => o.status === "DELIVERED").reduce((s, o) => s + o.total, 0);
    const agentCustomers = customers.filter((c) => c.agentId === a.id);
    const totalDebt = agentCustomers.reduce((s, c) => s + c.debt, 0);
    return {
      agentId: a.id,
      agentName: a.fullName,
      territory: a.territoryName,
      orders: agentOrders.length,
      revenue,
      target: a.monthlyTarget,
      performance: a.performance,
      customersCount: a.customersCount,
      totalDebt,
    };
  });
  res.json(agentReports);
});

router.get("/debts", authenticate, (_req: AuthRequest, res: Response) => {
  const debtCustomers = customers
    .filter((c) => c.debt > 0)
    .sort((a, b) => b.debt - a.debt)
    .map((c) => {
      const agent = agents.find((a) => a.id === c.agentId);
      return {
        customerId: c.id,
        customerName: c.companyName,
        phone: c.phone,
        district: c.district,
        debt: c.debt,
        agentName: agent?.fullName || "Unknown",
        status: c.debt > 5_000_000 ? "CRITICAL" : c.debt > 2_000_000 ? "OVERDUE" : "CURRENT",
      };
    });
  const totalDebt = customers.reduce((s, c) => s + c.debt, 0);
  const totalCollections = paymentsStore.reduce((s, p) => s + p.amount, 0);
  res.json({ debtCustomers, totalDebt, totalCollections });
});

export default router;
