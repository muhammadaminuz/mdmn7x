import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { monthlySales, categoryRevenue, agentPerformance, territoryRevenue, weeklyOrders, orderStatusDistribution } from "../data/analytics";

const router = Router();

router.get("/overview", authenticate, (_req: AuthRequest, res: Response) => {
  res.json({ monthlySales, categoryRevenue, agentPerformance, territoryRevenue, weeklyOrders, orderStatusDistribution });
});

router.get("/monthly-sales", authenticate, (_req: AuthRequest, res: Response) => {
  res.json(monthlySales);
});

router.get("/category-revenue", authenticate, (_req: AuthRequest, res: Response) => {
  res.json(categoryRevenue);
});

router.get("/agent-performance", authenticate, (_req: AuthRequest, res: Response) => {
  res.json(agentPerformance);
});

router.get("/territory-revenue", authenticate, (_req: AuthRequest, res: Response) => {
  res.json(territoryRevenue);
});

export default router;
