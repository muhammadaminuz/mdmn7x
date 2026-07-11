import { Request, Response, NextFunction } from "express";

const BOT_API_KEY = process.env.BOT_API_KEY || "";

export function botAuthenticate(req: Request, res: Response, next: NextFunction) {
  const key = req.headers["x-bot-api-key"];
  if (!BOT_API_KEY || key !== BOT_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
