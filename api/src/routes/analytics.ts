import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

async function buildAnalyticsData() {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const [allOrders, agents, orderStatusCounts, recentOrders, orderItems] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: twelveMonthsAgo }, status: { not: "CANCELLED" } },
      select: { createdAt: true, total: true },
    }),
    prisma.agent.findMany({
      where: { isActive: true },
      include: { territory: { select: { name: true } } },
    }),
    prisma.order.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.order.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
        status: { not: "CANCELLED" },
      },
      select: { createdAt: true, total: true },
    }),
    prisma.orderItem.findMany({
      include: { product: { select: { category: true } } },
    }),
  ]);

  // Monthly sales
  const monthNames = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];
  const monthMap: Record<string, number> = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap[key] = 0;
  }
  for (const o of allOrders) {
    const d = new Date(o.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (key in monthMap) monthMap[key] += Number(o.total);
  }
  const monthlySales = Object.entries(monthMap).map(([key, revenue]) => {
    const [, month] = key.split("-");
    return { month: monthNames[parseInt(month) - 1], revenue };
  });

  // Agent performance
  const agentPerformance = agents.map((a) => ({
    agentName: a.fullName,
    target: Number(a.monthlyTarget),
    achieved: Number(a.currentSales),
    performance: a.performance,
  }));

  // Order status distribution
  const orderStatusDistribution = orderStatusCounts.map((s) => ({
    status: s.status,
    count: s._count.id,
  }));

  // Weekly orders
  const dayNames = ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"];
  const weekMap: Record<string, { day: string; orders: number; revenue: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    weekMap[key] = { day: dayNames[d.getDay()], orders: 0, revenue: 0 };
  }
  for (const o of recentOrders) {
    const key = new Date(o.createdAt).toISOString().split("T")[0];
    if (key in weekMap) { weekMap[key].orders++; weekMap[key].revenue += Number(o.total); }
  }
  const weeklyOrders = Object.values(weekMap);

  // Category revenue
  const catMap: Record<string, number> = {};
  for (const item of orderItems) {
    const cat = item.product.category;
    catMap[cat] = (catMap[cat] || 0) + Number(item.total);
  }
  const total = Object.values(catMap).reduce((s, v) => s + v, 0) || 1;
  const categoryRevenue = Object.entries(catMap)
    .map(([category, revenue]) => ({ category, revenue, percentage: Math.round((revenue / total) * 100) }))
    .sort((a, b) => b.revenue - a.revenue);

  // Territory revenue (approximated from agent data)
  const territoryRevenue = agents.map((a) => ({
    territory: a.territory?.name ?? "",
    revenue: Number(a.currentSales),
  }));

  return { monthlySales, agentPerformance, categoryRevenue, orderStatusDistribution, weeklyOrders, territoryRevenue };
}

router.get("/overview", authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    res.json(await buildAnalyticsData());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/monthly-sales", authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const data = await buildAnalyticsData();
    res.json(data.monthlySales);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/category-revenue", authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const data = await buildAnalyticsData();
    res.json(data.categoryRevenue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/agent-performance", authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const data = await buildAnalyticsData();
    res.json(data.agentPerformance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/territory-revenue", authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const data = await buildAnalyticsData();
    res.json(data.territoryRevenue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
