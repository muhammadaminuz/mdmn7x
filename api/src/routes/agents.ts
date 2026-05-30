import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { agents } from "../data/agents";
import { ordersStore } from "../data/orders";
import { routeStops } from "../data/routes";

const router = Router();

router.get("/", authenticate, (_req: AuthRequest, res: Response) => {
  res.json(agents);
});

router.get("/live-locations", authenticate, (_req: AuthRequest, res: Response) => {
  const liveAgents = agents.filter((a) => a.isActive && a.latitude).map((a) => ({
    id: a.id,
    fullName: a.fullName,
    latitude: a.latitude,
    longitude: a.longitude,
    lastSeen: a.lastSeen,
    performance: a.performance,
    territoryName: a.territoryName,
  }));
  res.json(liveAgents);
});

router.get("/:id", authenticate, (req: AuthRequest, res: Response) => {
  const agent = agents.find((a) => a.id === Number(req.params.id));
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  const orders = ordersStore.filter((o) => o.agentId === agent.id).slice(0, 20);
  const today = new Date().toISOString().split("T")[0];
  const todayStops = routeStops.filter((s) => s.agentId === agent.id && s.date === today);
  const visitedCount = todayStops.filter((s) => s.status === "VISITED").length;
  return res.json({ ...agent, recentOrders: orders, todayRoute: todayStops, visitedToday: visitedCount, totalStops: todayStops.length });
});

router.get("/:id/route", authenticate, (req: AuthRequest, res: Response) => {
  const today = new Date().toISOString().split("T")[0];
  const stops = routeStops.filter((s) => s.agentId === Number(req.params.id) && s.date === today);
  res.json(stops);
});

export default router;
