// örn: src/core/middleware/auth/requireSellerModerator.ts
import type { Request, Response, NextFunction } from "express";

export function requireSellerAndModerator(req: Request, res: Response, next: NextFunction) {
  const u: any = (req as any).user;
  if (!u) return res.status(401).json({ success: false, message: "auth_required" });

  const roles: string[] = Array.isArray(u.roles) ? u.roles : [u.role].filter(Boolean);
  const has = (r: string) => roles.includes(r);

  if (has("admin") || (has("seller") && has("moderator"))) return next();
  return res.status(403).json({ success: false, message: "seller_and_moderator_required" });
}
