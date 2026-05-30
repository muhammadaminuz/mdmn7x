import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { users } from "../data/users";
import { agents } from "../data/agents";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "fmcg-distribution-erp-super-secret-2024";

router.post("/login", (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email && u.password === password && u.isActive);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const payload = {
    userId: user.id,
    role: user.role,
    email: user.email,
    agentId: user.agentId,
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
  const agent = user.agentId ? agents.find((a) => a.id === user.agentId) : null;
  return res.json({
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      agentId: user.agentId,
      agent,
    },
  });
});

router.get("/me", authenticate, (req: AuthRequest, res: Response) => {
  const user = users.find((u) => u.id === req.user!.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  const agent = user.agentId ? agents.find((a) => a.id === user.agentId) : null;
  return res.json({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    agentId: user.agentId,
    agent,
  });
});

router.post("/logout", (_req: Request, res: Response) => {
  res.json({ message: "Logged out" });
});

export default router;
