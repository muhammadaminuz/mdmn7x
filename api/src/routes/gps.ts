import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

// GET /agents - all active agents with latest GPS position
router.get("/agents", authenticate, async (req: AuthRequest, res: Response) => {
  const agents = await prisma.agent.findMany({
    where: { isActive: true },
    select: {
      id: true,
      fullName: true,
      phone: true,
      latitude: true,
      longitude: true,
      lastSeen: true,
      territory: { select: { name: true } },
    },
  });

  const result = agents.map((a) => ({
    id: a.id,
    fullName: a.fullName,
    phone: a.phone,
    latitude: a.latitude,
    longitude: a.longitude,
    lastSeen: a.lastSeen?.toISOString() ?? null,
    territoryName: a.territory?.name ?? "",
    isOnline: a.lastSeen ? (Date.now() - new Date(a.lastSeen).getTime()) < 15 * 60 * 1000 : false,
  }));

  return res.json({ items: result, total: result.length });
});

// POST /log - log GPS position
router.post("/log", authenticate, async (req: AuthRequest, res: Response) => {
  const { agentId, latitude, longitude, accuracy } = req.body;
  const resolvedAgentId = agentId || req.user?.agentId;

  if (!resolvedAgentId || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "agentId, latitude, longitude required" });
  }

  const [log] = await prisma.$transaction([
    prisma.gpsLog.create({
      data: {
        agentId: Number(resolvedAgentId),
        latitude: Number(latitude),
        longitude: Number(longitude),
        accuracy: accuracy ? Number(accuracy) : null,
      },
    }),
    prisma.agent.update({
      where: { id: Number(resolvedAgentId) },
      data: {
        latitude: Number(latitude),
        longitude: Number(longitude),
        lastSeen: new Date(),
      },
    }),
  ]);

  return res.status(201).json({
    id: log.id,
    agentId: log.agentId,
    latitude: log.latitude,
    longitude: log.longitude,
    accuracy: log.accuracy,
    createdAt: log.createdAt?.toISOString(),
  });
});

// GET /history/:agentId - GPS history for agent today
router.get("/history/:agentId", authenticate, async (req: AuthRequest, res: Response) => {
  const agentId = Number(req.params.agentId);
  const { date } = req.query;

  const targetDate = date ? new Date(String(date)) : new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const logs = await prisma.gpsLog.findMany({
    where: {
      agentId,
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
    orderBy: { createdAt: "asc" },
  });

  return res.json({
    agentId,
    date: targetDate.toISOString().slice(0, 10),
    items: logs.map((l) => ({
      id: l.id,
      latitude: l.latitude,
      longitude: l.longitude,
      accuracy: l.accuracy,
      createdAt: l.createdAt?.toISOString(),
    })),
    total: logs.length,
  });
});

export default router;
