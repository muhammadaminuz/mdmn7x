import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

router.get("/", authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const territories = await prisma.territory.findMany({
      include: {
        agents: { select: { id: true, fullName: true, isActive: true } },
        customers: { select: { id: true, debt: true } },
        _count: { select: { customers: true } },
      },
      orderBy: { name: "asc" },
    });

    res.json(territories.map((t) => ({
      id: t.id,
      name: t.name,
      region: t.region,
      customersCount: t._count.customers,
      totalDebt: t.customers.reduce((s, c) => s + Number(c.debt), 0),
      totalSales: 0, // computed on demand if needed
      agents: t.agents,
      createdAt: t.createdAt?.toISOString(),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const territory = await prisma.territory.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        agents: { select: { id: true, fullName: true, isActive: true, performance: true } },
        customers: { select: { id: true, companyName: true, debt: true, status: true } },
        _count: { select: { customers: true } },
      },
    });
    if (!territory) return res.status(404).json({ error: "Territory not found" });

    return res.json({
      id: territory.id,
      name: territory.name,
      region: territory.region,
      customersCount: territory._count.customers,
      totalDebt: territory.customers.reduce((s, c) => s + Number(c.debt), 0),
      agents: territory.agents,
      customers: territory.customers.map((c) => ({ ...c, debt: Number(c.debt) })),
      createdAt: territory.createdAt?.toISOString(),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
