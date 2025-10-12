// src/core/middleware/auth/authMiddleware.ts
import asyncHandler from "express-async-handler";
import { Request, Response, NextFunction, RequestHandler } from "express";
import { getTokenFromRequest } from "@/core/middleware/auth/authHelpers";
import { verifyToken } from "@/core/middleware/auth/token";
import type { UserPayload } from "@/types/userPayload";   // ⬅️ doğru tip
import type { AppRole } from "@/types/roles";             // ⬅️ AppRole
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import logger from "@/core/middleware/logger/logger";

interface AuthRequest extends Request {
  user?: UserPayload & {
    isAdmin?: boolean;
    isSeller?: boolean;
  };
}

// Tip güvenliği için rol evreni (type guard)
const ROLE_VALUES = [
  "superadmin","admin","manager","support","picker","viewer",
  "moderator","staff","customer","seller","user",
] as const;
const isAppRole = (v: any): v is AppRole => ROLE_VALUES.includes(v as AppRole);

// ✅ authenticate: roles[]’ı AppRole[] olarak ekle
export const authenticate = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const tenant = req.tenant || "unknown";
  const token = getTokenFromRequest(req);

  if (!token) {
    logger.warn("Authorization token missing", { tenant, module: "auth", event: "auth.authenticate", status: "fail", ip: req.ip });
    res.status(401).json({ success: false, message: "Authorization token missing" });
    return;
  }

  try {
    const decoded = verifyToken(token);
    const { User } = await getTenantModels(req);
    const user = await User.findById(decoded.id).select("-password");

    if (!user || !user.isActive) {
      logger.warn("Invalid or inactive user", { tenant, module: "auth", event: "auth.authenticate", status: "fail", userId: decoded.id, ip: req.ip });
      res.status(401).json({ success: false, message: "Invalid or inactive user" });
      return;
    }

    // roles dizisini AppRole[]’a daralt
    const rawRoles: any[] = Array.isArray(user.roles) && user.roles.length ? user.roles : [user.role].filter(Boolean);
    const rolesArr: AppRole[] = rawRoles
      .map((r) => String(r).trim())
      .filter(isAppRole);

    const isSuperadmin = user.role === "superadmin" || rolesArr.includes("superadmin");
    const isAdmin = isSuperadmin || rolesArr.includes("admin");
    const isSeller = rolesArr.includes("seller");

    (req as AuthRequest).user = {
      id: user.id.toString(),
      _id: user.id.toString(),
      role: isAppRole(user.role) ? user.role : "user",   // güvenli atama
      roles: rolesArr,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      isSuperadmin,
      // yardımcı bayraklar
      isAdmin,
      isSeller,
    };

    next();
  } catch (error: any) {
    logger.error("Invalid or expired token", { tenant, module: "auth", event: "auth.authenticate", status: "fail", error: error.message, ip: req.ip });
    res.status(401).json({ success: false, message: error.name === "TokenExpiredError" ? "Token expired" : "Invalid or expired token" });
    return;
  }
});

// ✅ authorizeRoles: AppRole[] ile imza ve kontrol
export const authorizeRoles = (...roles: AppRole[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthRequest).user;
    const tenant = req.tenant || "unknown";

    if (!user) {
      logger.warn("User not authenticated", { tenant, module: "auth", event: "auth.authorizeRoles", status: "fail", ip: req.ip });
      res.status(401).json({ success: false, message: "User not authenticated" });
      return;
    }

    if (user.isSuperadmin) {
      logger.info("Superadmin override, role access granted", { tenant, module: "auth", event: "auth.authorizeRoles", status: "success", userId: user.id, ip: req.ip });
      return next();
    }

    const userRoles = new Set<AppRole>([user.role, ...(user.roles || [])]);
    const ok = roles.some((r) => userRoles.has(r));
    if (!ok) {
      logger.warn("Role access denied", {
        tenant,
        module: "auth",
        event: "auth.authorizeRoles",
        status: "fail",
        userId: user.id,
        userRole: user.role,
        userRoles: [...userRoles],
        requiredRoles: roles,
        ip: req.ip,
      });
      res.status(403).json({ success: false, message: `Access denied. Required role(s): ${roles.join(", ")}` });
      return;
    }

    next();
  };
};
