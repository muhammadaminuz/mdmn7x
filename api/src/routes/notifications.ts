import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { notificationsStore } from "../data/notifications";

const router = Router();

router.get("/", authenticate, (_req: AuthRequest, res: Response) => {
  const sorted = [...notificationsStore].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ items: sorted, unreadCount: sorted.filter((n) => !n.isRead).length });
});

router.put("/:id/read", authenticate, (req: AuthRequest, res: Response) => {
  const idx = notificationsStore.findIndex((n) => n.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "Notification not found" });
  notificationsStore[idx].isRead = true;
  return res.json(notificationsStore[idx]);
});

router.put("/mark-all-read", authenticate, (_req: AuthRequest, res: Response) => {
  notificationsStore.forEach((n) => { n.isRead = true; });
  res.json({ message: "All notifications marked as read" });
});

export default router;
