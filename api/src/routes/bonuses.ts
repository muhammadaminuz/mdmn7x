import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

function mapRule(r: any) {
  return {
    id: r.id,
    name: r.name,
    targetType: r.targetType,
    targetValue: Number(r.targetValue),
    bonusAmount: Number(r.bonusAmount),
    bonusType: r.bonusType,
    isActive: r.isActive,
    logCount: r._count?.bonusLogs ?? 0,
    createdAt: r.createdAt?.toISOString(),
  };
}

function mapLog(l: any) {
  return {
    id: l.id,
    agentId: l.agentId,
    agentName: l.agent?.fullName ?? "",
    ruleId: l.ruleId ?? null,
    ruleName: l.rule?.name ?? null,
    amount: Number(l.amount),
    description: l.description,
    month: l.month,
    year: l.year,
    createdAt: l.createdAt?.toISOString(),
  };
}

// GET /rules - list bonus rules
router.get("/rules", authenticate, async (req: AuthRequest, res: Response) => {
  const rules = await prisma.bonusRule.findMany({
    include: { _count: { select: { bonusLogs: true } } },
    orderBy: { createdAt: "desc" },
  });
  return res.json({ items: rules.map(mapRule), total: rules.length });
});

// POST /rules - create rule
router.post("/rules", authenticate, async (req: AuthRequest, res: Response) => {
  const { name, targetType, targetValue, bonusAmount, bonusType } = req.body;
  if (!name || !targetType || !targetValue || !bonusAmount || !bonusType) {
    return res.status(400).json({ error: "name, targetType, targetValue, bonusAmount, bonusType required" });
  }

  const rule = await prisma.bonusRule.create({
    data: {
      name,
      targetType,
      targetValue: Number(targetValue),
      bonusAmount: Number(bonusAmount),
      bonusType,
    },
    include: { _count: { select: { bonusLogs: true } } },
  });

  return res.status(201).json(mapRule(rule));
});

// PUT /rules/:id - update rule
router.put("/rules/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const { name, targetType, targetValue, bonusAmount, bonusType, isActive } = req.body;

  const rule = await prisma.bonusRule.update({
    where: { id: Number(req.params.id) },
    data: {
      name,
      targetType,
      targetValue: targetValue !== undefined ? Number(targetValue) : undefined,
      bonusAmount: bonusAmount !== undefined ? Number(bonusAmount) : undefined,
      bonusType,
      isActive,
    },
    include: { _count: { select: { bonusLogs: true } } },
  });

  return res.json(mapRule(rule));
});

// GET /summary - monthly bonus summary by agent
router.get("/summary", authenticate, async (req: AuthRequest, res: Response) => {
  const now = new Date();
  const month = Number(req.query.month ?? now.getMonth() + 1);
  const year = Number(req.query.year ?? now.getFullYear());

  const grouped = await prisma.bonusLog.groupBy({
    by: ["agentId"],
    where: { month, year },
    _sum: { amount: true },
    _count: true,
  });

  const agentIds = grouped.map((g) => g.agentId);
  const agents = await prisma.agent.findMany({
    where: { id: { in: agentIds } },
    select: { id: true, fullName: true },
  });
  const agentMap = new Map(agents.map((a) => [a.id, a.fullName]));

  const summary = grouped.map((g) => ({
    agentId: g.agentId,
    agentName: agentMap.get(g.agentId) ?? "",
    totalBonus: Number(g._sum.amount ?? 0),
    bonusCount: g._count,
    month,
    year,
  }));

  return res.json({ summary, month, year });
});

// GET /logs - list bonus logs
router.get("/logs", authenticate, async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 20, agentId, month, year } = req.query;
  const p = Number(page); const l = Number(limit);

  const where: any = {};
  if (agentId) where.agentId = Number(agentId);
  if (month) where.month = Number(month);
  if (year) where.year = Number(year);
  if (req.user?.role === "SALES_AGENT" && req.user.agentId) {
    where.agentId = req.user.agentId;
  }

  const [items, total] = await Promise.all([
    prisma.bonusLog.findMany({
      where,
      include: {
        agent: { select: { fullName: true } },
        rule: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (p - 1) * l,
      take: l,
    }),
    prisma.bonusLog.count({ where }),
  ]);

  return res.json({ items: items.map(mapLog), total, page: p, limit: l, totalPages: Math.ceil(total / l) });
});

// POST /logs - award bonus manually
router.post("/logs", authenticate, async (req: AuthRequest, res: Response) => {
  const { agentId, ruleId, amount, description, month, year } = req.body;
  if (!agentId || !amount || !description || !month || !year) {
    return res.status(400).json({ error: "agentId, amount, description, month, year required" });
  }

  const log = await prisma.bonusLog.create({
    data: {
      agentId: Number(agentId),
      ruleId: ruleId ? Number(ruleId) : null,
      amount: Number(amount),
      description,
      month: Number(month),
      year: Number(year),
    },
    include: {
      agent: { select: { fullName: true } },
      rule: { select: { name: true } },
    },
  });

  return res.status(201).json(mapLog(log));
});

export default router;
