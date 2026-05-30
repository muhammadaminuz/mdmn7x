import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "fmcg-distribution-erp-super-secret-2024";

function mapAgent(agent: any) {
  if (!agent) return null;
  return {
    id: agent.id,
    fullName: agent.fullName,
    phone: agent.phone,
    email: agent.email,
    territoryId: agent.territoryId,
    territoryName: agent.territory?.name ?? "",
    monthlyTarget: Number(agent.monthlyTarget),
    currentSales: Number(agent.currentSales),
    performance: agent.performance,
    customersCount: agent._count?.customers ?? 0,
    isActive: agent.isActive,
    latitude: agent.latitude,
    longitude: agent.longitude,
    lastSeen: agent.lastSeen?.toISOString() ?? null,
  };
}

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return res.status(401).json({ error: "Invalid credentials" });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const payload = { userId: user.id, role: user.role, email: user.email, agentId: user.agentId ?? undefined };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });

  let agent = null;
  if (user.agentId) {
    const a = await prisma.agent.findUnique({ where: { id: user.agentId }, include: { territory: true, _count: { select: { customers: true } } } });
    agent = mapAgent(a);
  }

  return res.json({ token, user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, agentId: user.agentId, agent } });
});

router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) return res.status(404).json({ error: "User not found" });
  let agent = null;
  if (user.agentId) {
    const a = await prisma.agent.findUnique({ where: { id: user.agentId }, include: { territory: true, _count: { select: { customers: true } } } });
    agent = mapAgent(a);
  }
  return res.json({ id: user.id, fullName: user.fullName, email: user.email, phone: user.phone, role: user.role, agentId: user.agentId, agent });
});

router.post("/logout", (_req: Request, res: Response) => {
  res.json({ message: "Logged out" });
});

export default router;
