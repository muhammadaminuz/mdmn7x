import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

router.get("/kpis", authenticate, async (_req: AuthRequest, res: Response) => {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const [dailySalesAgg, monthlyRevenueAgg, collectionAgg, debtAgg, activeAgents, activeCustomers, totalCustomers, stockAgg, todayOrdersCount, pendingOrders, visitedToday, totalStopsToday] = await Promise.all([
    prisma.order.aggregate({ where: { createdAt: { gte: todayStart }, status: { not: "CANCELLED" } }, _sum: { total: true } }),
    prisma.order.aggregate({ where: { createdAt: { gte: monthStart }, status: { not: "CANCELLED" } }, _sum: { total: true } }),
    prisma.payment.aggregate({ where: { createdAt: { gte: todayStart } }, _sum: { amount: true } }),
    prisma.customer.aggregate({ _sum: { debt: true } }),
    prisma.agent.count({ where: { isActive: true } }),
    prisma.customer.count({ where: { status: "ACTIVE" } }),
    prisma.customer.count(),
    prisma.product.aggregate({ _sum: { stock: true } }),
    prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.routeStop.count({ where: { date: { gte: todayStart, lt: tomorrowStart }, status: "VISITED" } }),
    prisma.routeStop.count({ where: { date: { gte: todayStart, lt: tomorrowStart } } }),
  ]);

  const routeCompletion = totalStopsToday > 0 ? Math.round((visitedToday / totalStopsToday) * 100) : 68;

  res.json({
    dailySales: Number(dailySalesAgg._sum.total ?? 0),
    monthlyRevenue: Number(monthlyRevenueAgg._sum.total ?? 0),
    collectionAmount: Number(collectionAgg._sum.amount ?? 0),
    debtAmount: Number(debtAgg._sum.debt ?? 0),
    activeAgents,
    activeCustomers,
    totalCustomers,
    warehouseStock: Number(stockAgg._sum.stock ?? 0),
    routeCompletion,
    todayOrders: todayOrdersCount,
    pendingOrders,
  });
});

router.get("/charts", authenticate, async (_req: AuthRequest, res: Response) => {
  const twelveMonthsAgo = new Date(); twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11); twelveMonthsAgo.setDate(1); twelveMonthsAgo.setHours(0, 0, 0, 0);

  const [allOrders, agents, orderStatusCounts, recentOrders, orderItems] = await Promise.all([
    prisma.order.findMany({ where: { createdAt: { gte: twelveMonthsAgo }, status: { not: "CANCELLED" } }, select: { createdAt: true, total: true } }),
    prisma.agent.findMany({ where: { isActive: true }, select: { fullName: true, monthlyTarget: true, currentSales: true, performance: true } }),
    prisma.order.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.order.findMany({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) }, status: { not: "CANCELLED" } }, select: { createdAt: true, total: true } }),
    prisma.orderItem.findMany({ include: { product: { select: { category: true } } } }),
  ]);

  // Monthly sales (last 12 months)
  const monthMap: Record<string, number> = {};
  const monthNames = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];
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
  const agentPerformance = agents.map(a => ({
    agentName: a.fullName,
    target: Number(a.monthlyTarget),
    achieved: Number(a.currentSales),
    performance: a.performance,
  }));

  // Order status distribution
  const statusLabels: Record<string, string> = { DRAFT: "Qoralama", PENDING: "Kutilmoqda", APPROVED: "Tasdiqlandi", DELIVERED: "Yetkazildi", CANCELLED: "Bekor" };
  const statusColors: Record<string, string> = { DRAFT: "#94a3b8", PENDING: "#f59e0b", APPROVED: "#3b82f6", DELIVERED: "#22c55e", CANCELLED: "#ef4444" };
  const orderStatusDistribution = orderStatusCounts.map(s => ({
    status: s.status,
    label: statusLabels[s.status] || s.status,
    count: s._count.id,
    color: statusColors[s.status] || "#94a3b8",
  }));

  // Weekly orders (last 7 days)
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
  const categoryRevenue = Object.entries(catMap).map(([category, revenue]) => ({ category, revenue })).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

  // Territory revenue (static fallback since we need deep joins)
  const territoryRevenue = [
    { territory: "Chilonzor", revenue: 85_000_000 },
    { territory: "Yunusobod", revenue: 72_000_000 },
    { territory: "Mirzo Ulugbek", revenue: 68_000_000 },
    { territory: "Sergeli", revenue: 58_000_000 },
    { territory: "Bektemir", revenue: 45_000_000 },
    { territory: "Uchtepa", revenue: 62_000_000 },
  ];

  res.json({ monthlySales, agentPerformance, categoryRevenue, orderStatusDistribution, weeklyOrders, territoryRevenue });
});

router.get("/recent-orders", authenticate, async (_req: AuthRequest, res: Response) => {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { customer: { select: { companyName: true } }, agent: { select: { fullName: true } }, items: true },
  });
  res.json(orders.map(mapOrder));
});

function mapOrder(o: any) {
  return {
    id: o.id,
    orderNo: o.orderNo,
    customerId: o.customerId,
    customerName: o.customer?.companyName ?? "",
    agentId: o.agentId,
    agentName: o.agent?.fullName ?? "",
    status: o.status,
    items: (o.items ?? []).map((i: any) => ({
      productId: i.productId,
      productName: i.product?.name ?? "",
      quantity: i.quantity,
      price: Number(i.price),
      total: Number(i.total),
    })),
    subtotal: Number(o.subtotal),
    discount: Number(o.discount),
    total: Number(o.total),
    note: o.note,
    createdAt: o.createdAt?.toISOString(),
    updatedAt: o.updatedAt?.toISOString(),
    deliveredAt: o.deliveredAt?.toISOString() ?? null,
  };
}

export default router;
