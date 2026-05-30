import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { ordersStore } from "../data/orders";
import { customers } from "../data/customers";
import { agents } from "../data/agents";
import { paymentsStore } from "../data/payments";
import { monthlySales, agentPerformance, categoryRevenue, orderStatusDistribution, weeklyOrders, territoryRevenue } from "../data/analytics";
import { products } from "../data/products";
import { warehouses } from "../data/warehouses";

const router = Router();

router.get("/kpis", authenticate, (_req: AuthRequest, res: Response) => {
  const today = new Date().toISOString().split("T")[0];
  const todayOrders = ordersStore.filter((o) => o.createdAt.startsWith(today));
  const todaySales = todayOrders.reduce((s, o) => s + (o.status !== "CANCELLED" ? o.total : 0), 0);
  const monthlyRevenue = monthlySales[monthlySales.length - 1].revenue;
  const totalDebt = customers.reduce((s, c) => s + c.debt, 0);
  const todayCollections = paymentsStore
    .filter((p) => p.createdAt.startsWith(today))
    .reduce((s, p) => s + p.amount, 0);
  const activeAgents = agents.filter((a) => a.isActive).length;
  const activeCustomers = customers.filter((c) => c.status === "ACTIVE").length;
  const totalStock = products.reduce((s, p) => s + p.stock, 0);
  const activeWarehouses = warehouses.filter((w) => w.isActive).length;
  const deliveredToday = todayOrders.filter((o) => o.status === "DELIVERED").length;
  const routeCompletion = todayOrders.length > 0 ? Math.round((deliveredToday / (todayOrders.length || 1)) * 100) : 68;

  res.json({
    dailySales: todaySales,
    monthlyRevenue,
    collectionAmount: todayCollections,
    debtAmount: totalDebt,
    activeAgents,
    activeCustomers,
    warehouseStock: totalStock,
    routeCompletion,
    activeWarehouses,
    totalCustomers: customers.length,
    todayOrders: todayOrders.length,
    pendingOrders: ordersStore.filter((o) => o.status === "PENDING").length,
  });
});

router.get("/charts", authenticate, (_req: AuthRequest, res: Response) => {
  res.json({
    monthlySales,
    agentPerformance,
    categoryRevenue,
    orderStatusDistribution,
    weeklyOrders,
    territoryRevenue,
  });
});

router.get("/recent-orders", authenticate, (_req: AuthRequest, res: Response) => {
  const recent = [...ordersStore]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);
  res.json(recent);
});

export default router;
