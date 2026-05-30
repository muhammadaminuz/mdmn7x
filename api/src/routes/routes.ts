import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { routeStops } from "../data/routes";

const router = Router();

router.get("/today", authenticate, (req: AuthRequest, res: Response) => {
  const today = new Date().toISOString().split("T")[0];
  const agentId = req.user?.agentId || Number(req.query.agentId);
  let stops = routeStops.filter((s) => s.date === today);
  if (agentId) stops = stops.filter((s) => s.agentId === agentId);
  stops.sort((a, b) => a.order - b.order);
  const visited = stops.filter((s) => s.status === "VISITED").length;
  const pending = stops.filter((s) => s.status === "PENDING").length;
  const completion = stops.length > 0 ? Math.round((visited / stops.length) * 100) : 0;
  res.json({ stops, visited, pending, total: stops.length, completion });
});

router.put("/:id/visit", authenticate, (req: AuthRequest, res: Response) => {
  const stop = routeStops.find((s) => s.id === Number(req.params.id));
  if (!stop) return res.status(404).json({ error: "Stop not found" });
  stop.status = "VISITED";
  if (req.body.orderId) stop.orderId = req.body.orderId;
  if (req.body.collectionAmount) stop.collectionAmount = req.body.collectionAmount;
  return res.json(stop);
});

export default router;
