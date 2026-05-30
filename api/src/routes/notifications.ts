import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

function mapNotification(n: any) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    isRead: n.isRead,
    userId: n.userId,
    createdAt: n.createdAt?.toISOString(),
  };
}

router.get("/", authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
    });
    const items = notifications.map(mapNotification);
    res.json({ items, unreadCount: items.filter((n) => !n.isRead).length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id/read", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: Number(req.params.id) },
      data: { isRead: true },
    });
    return res.json(mapNotification(notification));
  } catch (err: any) {
    if (err?.code === "P2025") return res.status(404).json({ error: "Notification not found" });
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/mark-all-read", authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({ data: { isRead: true } });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
