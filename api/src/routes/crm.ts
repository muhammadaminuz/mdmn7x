import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

router.get("/summary", authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const [totalCustomers, activeCustomers, inactiveCustomers, blockedCustomers, debtAgg, balanceAgg] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { status: "ACTIVE" } }),
      prisma.customer.count({ where: { status: "INACTIVE" } }),
      prisma.customer.count({ where: { status: "BLOCKED" } }),
      prisma.customer.aggregate({ _sum: { debt: true } }),
      prisma.customer.aggregate({ _sum: { balance: true } }),
    ]);

    const criticalDebtors = await prisma.customer.count({ where: { debt: { gt: 5_000_000 } } });

    res.json({
      totalCustomers,
      activeCustomers,
      inactiveCustomers,
      blockedCustomers,
      totalDebt: Number(debtAgg._sum.debt ?? 0),
      totalBalance: Number(balanceAgg._sum.balance ?? 0),
      criticalDebtors,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/top-customers", authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        orders: {
          where: { status: "DELIVERED" },
          select: { total: true },
        },
        _count: { select: { orders: true } },
      },
    });

    const customerRevenue = customers
      .map((c) => ({
        id: c.id,
        companyName: c.companyName,
        ownerName: c.ownerName,
        phone: c.phone,
        district: c.district,
        debt: Number(c.debt),
        balance: Number(c.balance),
        status: c.status,
        agentId: c.agentId,
        territoryId: c.territoryId,
        revenue: c.orders.reduce((s, o) => s + Number(o.total), 0),
        orders: c._count.orders,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json(customerRevenue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/debt-aging", authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const [low, medium, high, critical] = await Promise.all([
      prisma.customer.count({ where: { debt: { gt: 0, lte: 1_000_000 } } }),
      prisma.customer.count({ where: { debt: { gt: 1_000_000, lte: 3_000_000 } } }),
      prisma.customer.count({ where: { debt: { gt: 3_000_000, lte: 5_000_000 } } }),
      prisma.customer.count({ where: { debt: { gt: 5_000_000 } } }),
    ]);

    res.json({
      "0-30 days": low,
      "31-60 days": medium,
      "61-90 days": high,
      "90+ days": critical,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
