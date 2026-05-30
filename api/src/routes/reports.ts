import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

router.get("/sales", authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const [revenueAgg, totalOrders, deliveredOrders, cancelledOrders, allOrders] = await Promise.all([
      prisma.order.aggregate({
        where: { status: "DELIVERED" },
        _sum: { total: true },
      }),
      prisma.order.count(),
      prisma.order.count({ where: { status: "DELIVERED" } }),
      prisma.order.count({ where: { status: "CANCELLED" } }),
      prisma.order.findMany({
        where: { createdAt: { gte: twelveMonthsAgo }, status: { not: "CANCELLED" } },
        select: { createdAt: true, total: true },
      }),
    ]);

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

    res.json({
      totalRevenue: Number(revenueAgg._sum.total ?? 0),
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      monthlySales,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/agents", authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const agents = await prisma.agent.findMany({
      include: {
        territory: { select: { name: true } },
        customers: { select: { id: true, debt: true } },
        orders: { where: { status: "DELIVERED" }, select: { total: true } },
        _count: { select: { orders: true, customers: true } },
      },
    });

    const agentReports = agents.map((a) => ({
      agentId: a.id,
      agentName: a.fullName,
      territory: a.territory?.name ?? "",
      orders: a._count.orders,
      revenue: a.orders.reduce((s, o) => s + Number(o.total), 0),
      target: Number(a.monthlyTarget),
      performance: a.performance,
      customersCount: a._count.customers,
      totalDebt: a.customers.reduce((s, c) => s + Number(c.debt), 0),
    }));

    res.json(agentReports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/debts", authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const [customers, collectionsAgg] = await Promise.all([
      prisma.customer.findMany({
        where: { debt: { gt: 0 } },
        include: { agent: { select: { fullName: true } } },
        orderBy: { debt: "desc" },
      }),
      prisma.payment.aggregate({ _sum: { amount: true } }),
    ]);

    const totalDebt = await prisma.customer.aggregate({ _sum: { debt: true } });

    const debtCustomers = customers.map((c) => ({
      customerId: c.id,
      customerName: c.companyName,
      phone: c.phone,
      district: c.district,
      debt: Number(c.debt),
      agentName: c.agent?.fullName ?? "Unknown",
      status: Number(c.debt) > 5_000_000 ? "CRITICAL" : Number(c.debt) > 2_000_000 ? "OVERDUE" : "CURRENT",
    }));

    res.json({
      debtCustomers,
      totalDebt: Number(totalDebt._sum.debt ?? 0),
      totalCollections: Number(collectionsAgg._sum.amount ?? 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
