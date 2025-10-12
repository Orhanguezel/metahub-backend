import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { Role } from "./types";

/** Hafif in-memory rate limiter (route-bazlı). Prod’da Redis önerilir. */

type TenantReq = Request & { tenant?: string; user?: { id?: string; role?: Role; roles?: Role[] } };

type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

type Opts = {
  windowMs: number;                  // örn: 15 * 60 * 1000
  limit: number;                     // default limit
  key?: (req: TenantReq) => string;  // anahtar üretici
  message?: string;
  exemptRoles?: Role[];              // muaf roller
  dynamicLimit?: (req: TenantReq) => number | null | undefined; // role göre limit
};

export function rateLimit(opts: Opts): RequestHandler {
  const windowMs = opts.windowMs;
  const baseLimit = opts.limit;
  const message = opts.message || "Too many requests, please try again later.";

  const keyFn =
    opts.key ||
    ((req: TenantReq) => {
      const tenant = req.tenant || "unknown";
      const uid = req.user?.id;
      // Auth'lu isteklerde (özellikle hassas işlemler) userId bazlı anahtar
      if (uid) return `${tenant}|uid:${uid}|${req.path}`;
      // Anonimlerde IP bazlı
      return `${tenant}|ip:${req.ip}|${req.path}`;
    });

  const isExempt = (req: TenantReq) => {
    const roles = Array.isArray(req.user?.roles) ? (req.user!.roles as Role[]) : (req.user?.role ? [req.user.role as Role] : []);
    return (opts.exemptRoles || []).some((r) => roles.includes(r));
  };

  return (req: TenantReq, res: Response, next: NextFunction): void => {
    if (isExempt(req)) { next(); return; }

    const now = Date.now();
    const key = keyFn(req);
    const bucket = store.get(key);

    const dyn = opts.dynamicLimit?.(req);
    const limit = Number.isFinite(dyn as number) && (dyn as number)! > 0 ? (dyn as number) : baseLimit;

    if (!bucket || bucket.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (bucket.count >= limit) {
      const retryAfter = Math.max(0, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader("Retry-After", retryAfter.toString());
      res.status(429).json({ success: false, message });
      return;
    }

    bucket.count += 1;
    next();
  };
}

/* ------- Preset'ler (RBAC uyumlu) ------- */

const dynByRole = (heavyLimit: number, normalLimit: number) => (req: TenantReq) => {
  const roles = Array.isArray(req.user?.roles) ? (req.user!.roles as Role[]) : (req.user?.role ? [req.user.role as Role] : []);
  // Destek/admin tarafında daha geniş pencere
  if (roles.some((r) => ["admin", "manager", "support"].includes(r))) return heavyLimit;
  return normalLimit;
};

export const rlForgotPassword: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 dk
  limit: 5,
  dynamicLimit: dynByRole(30, 5), // admin/support için gevşek
});

export const rlResetPassword: RequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 saat
  limit: 10,
  dynamicLimit: dynByRole(60, 10),
});

export const rlChangeEmailStart: RequestHandler = rateLimit({
  windowMs: 30 * 60 * 1000,   // 30 dk
  limit: 5,
  dynamicLimit: dynByRole(20, 5),
});

export const rlChangeEmailConfirm: RequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 saat
  limit: 10,
  dynamicLimit: dynByRole(40, 10),
});
