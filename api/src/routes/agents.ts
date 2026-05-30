import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

function mapAgent(a: any, todayStops?: any[]) {
  const stops = todayStops ?? a.routeStops ?? [];
  const visitedToday = stops.filter((s: any) => s.status === "VISITED").length;
  const totalStops = stops.length;
  return {
    id: a.id,
    fullName: a.fullName,
    phone: a.phone,
    email: a.email,
    territoryId: a.territoryId,
    territoryName: a.territory?.name ?? "",
    monthlyTarget: Number(a.monthlyTarget),
    currentSales: Number(a.currentSales),
    performance: a.performance,
    customersCount: a._count?.customers ?? 0,
    isActive: a.isActive,
    latitude: a.latitude,
    longitude: a.longitude,
    lastSeen: a.lastSeen?.toISOString() ?? null,
    visitedToday,
    totalStops,
  };
}

router.get("/", authenticate, async (_req: AuthRequest, res: Response) => {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const agents = await prisma.agent.findMany({
    include: {
      territory: { select: { name: true } },
      _count: { select: { customers: true } },
      routeStops: { where: { date: { gte: todayStart, lt: tomorrowStart } }, select: { status: true } },
    },
    orderBy: { performance: "desc" },
  });
  res.json(agents.map(a => mapAgent(a)));
});

router.get("/live-locations", authenticate, async (_req: AuthRequest, res: Response) => {
  const agents = await prisma.agent.findMany({
    where: { isActive: true, latitude: { not: null } },
    include: { territory: { select: { name: true } } },
  });
  res.json(agents.map(a => ({ id: a.id, fullName: a.fullName, latitude: a.latitude, longitude: a.longitude, lastSeen: a.lastSeen?.toISOString() ?? null, performance: a.performance, territoryName: a.territory?.name ?? "" })));
});

router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const agent = await prisma.agent.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      territory: { select: { name: true } },
      _count: { select: { customers: true } },
      orders: { orderBy: { createdAt: "desc" }, take: 20, include: { customer: { select: { companyName: true } } } },
      routeStops: {
        where: { date: { gte: todayStart, lt: tomorrowStart } },
        include: { customer: { select: { companyName: true, address: true, latitude: true, longitude: true } } },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!agent) return res.status(404).json({ error: "Agent not found" });

  const visitedToday = agent.routeStops.filter((s: any) => s.status === "VISITED").length;
  return res.json({
    ...mapAgent(agent),
    recentOrders: agent.orders.map((o: any) => ({ id: o.id, orderNo: o.orderNo, customerName: o.customer?.companyName ?? "", status: o.status, total: Number(o.total), createdAt: o.createdAt?.toISOString() })),
    visitedToday,
    totalStops: agent.routeStops.length,
  });
});

router.get("/:id/route", authenticate, async (req: AuthRequest, res: Response) => {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const stops = await prisma.routeStop.findMany({
    where: { agentId: Number(req.params.id), date: { gte: todayStart, lt: tomorrowStart } },
    include: { customer: { select: { companyName: true, address: true, latitude: true, longitude: true } } },
    orderBy: { order: "asc" },
  });
  res.json(stops.map(mapStop));
});

function mapStop(s: any) {
  return {
    id: s.id, agentId: s.agentId, customerId: s.customerId,
    customerName: s.customer?.companyName ?? "",
    address: s.customer?.address ?? "",
    latitude: s.customer?.latitude ?? 0,
    longitude: s.customer?.longitude ?? 0,
    plannedTime: s.plannedTime?.toISOString() ?? "",
    status: s.status, orderId: s.orderId,
    collectionAmount: Number(s.collectionAmount ?? 0),
    date: s.date?.toISOString().split("T")[0] ?? "",
    order: s.order,
  };
}

export default router;
