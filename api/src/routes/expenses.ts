import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

function mapExpense(e: any) {
  return {
    id: e.id,
    category: e.category,
    amount: Number(e.amount),
    description: e.description,
    paidById: e.paidById ?? null,
    paidByName: e.paidBy?.fullName ?? null,
    method: e.method,
    createdAt: e.createdAt?.toISOString(),
  };
}

// GET /summary - total by category (must be before /:id)
router.get("/summary", authenticate, async (req: AuthRequest, res: Response) => {
  const { from, to } = req.query;
  const where: any = {};
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(String(from));
    if (to) { const toDate = new Date(String(to)); toDate.setHours(23, 59, 59, 999); where.createdAt.lte = toDate; }
  }

  const grouped = await prisma.expense.groupBy({
    by: ["category"],
    where,
    _sum: { amount: true },
    _count: true,
  });

  const summary = grouped.map((g) => ({
    category: g.category,
    total: Number(g._sum.amount ?? 0),
    count: g._count,
  }));

  const totalAmount = summary.reduce((s, g) => s + g.total, 0);

  return res.json({ summary, totalAmount });
});

// GET / - list expenses
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 20, category, from, to } = req.query;
  const p = Number(page); const l = Number(limit);

  const where: any = {};
  if (category) where.category = String(category);
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(String(from));
    if (to) { const toDate = new Date(String(to)); toDate.setHours(23, 59, 59, 999); where.createdAt.lte = toDate; }
  }

  const [items, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { paidBy: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
      skip: (p - 1) * l,
      take: l,
    }),
    prisma.expense.count({ where }),
  ]);

  return res.json({ items: items.map(mapExpense), total, page: p, limit: l, totalPages: Math.ceil(total / l) });
});

// POST / - create expense
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  const { category, amount, description, method } = req.body;
  if (!category || !amount || !description || !method) {
    return res.status(400).json({ error: "category, amount, description, method required" });
  }

  const expense = await prisma.expense.create({
    data: {
      category,
      amount: Number(amount),
      description,
      method,
      paidById: req.user?.id ?? null,
    },
    include: { paidBy: { select: { fullName: true } } },
  });

  return res.status(201).json(mapExpense(expense));
});

// DELETE /:id - delete expense
router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  await prisma.expense.delete({ where: { id: Number(req.params.id) } });
  return res.json({ success: true });
});

export default router;
