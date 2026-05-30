import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { territories } from "../data/territories";

const router = Router();

router.get("/", authenticate, (_req: AuthRequest, res: Response) => {
  res.json(territories);
});

router.get("/:id", authenticate, (req: AuthRequest, res: Response) => {
  const territory = territories.find((t) => t.id === Number(req.params.id));
  if (!territory) return res.status(404).json({ error: "Territory not found" });
  return res.json(territory);
});

export default router;
