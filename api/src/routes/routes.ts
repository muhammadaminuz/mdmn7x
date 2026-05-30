import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

function mapStop(s: any) {
  return {
    id: s.id,
    agentId: s.agentId,
    customerId: s.customerId,
    customerName: s.customer?.companyName ?? "",
    address: s.customer?.address ?? "",
    latitude: s.customer?.latitude ?? 0,
    longitude: s.customer?.longitude ?? 0,
    plannedTime: s.plannedTime?.toISOString() ?? "",
    status: s.status,
    orderId: s.orderId ?? null,
    collectionAmount: s.collectionAmount ? Number(s.collectionAmount) : null,
    date: s.date?.toISOString().split("T")[0] ?? "",
    order: s.order,
  };
}

router.get("/today", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const agentId = req.user?.agentId || (req.query.agentId ? Number(req.query.agentId) : undefined);

    const where: any = { date: { gte: todayStart, lt: tomorrowStart } };
    if (agentId) where.agentId = agentId;

    const stops = await prisma.routeStop.findMany({
      where,
      include: {
        customer: { select: { companyName: true, address: true, latitude: true, longitude: true } },
      },
      orderBy: { order: "asc" },
    });

    const mappedStops = stops.map(mapStop);
    const visited = mappedStops.filter((s) => s.status === "VISITED").length;
    const pending = mappedStops.filter((s) => s.status === "PENDING").length;
    const completion = stops.length > 0 ? Math.round((visited / stops.length) * 100) : 0;

    res.json({ stops: mappedStops, visited, pending, total: stops.length, completion });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id/visit", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const updateData: any = { status: "VISITED" };
    if (req.body.orderId) updateData.orderId = Number(req.body.orderId);
    if (req.body.collectionAmount) updateData.collectionAmount = Number(req.body.collectionAmount);

    const stop = await prisma.routeStop.update({
      where: { id: Number(req.params.id) },
      data: updateData,
      include: {
        customer: { select: { companyName: true, address: true, latitude: true, longitude: true } },
      },
    });
    return res.json(mapStop(stop));
  } catch (err: any) {
    if (err?.code === "P2025") return res.status(404).json({ error: "Stop not found" });
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
