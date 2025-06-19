import asyncHandler from "express-async-handler";
import { Request, Response, NextFunction, RequestHandler } from "express";
import { getTokenFromRequest } from "@/core/utils/authHelpers";
import { verifyToken } from "@/core/utils/token";
import { UserPayload } from "@/types/userPayload";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import logger from "@/core/middleware/logger/logger";

interface AuthRequest extends Request {
  user?: UserPayload;
}

// ✅ GÜNCELLENMİŞ authenticate (tenant-aware log ile)
export const authenticate = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const tenant = req.tenant || "unknown";
    const token = getTokenFromRequest(req);

    if (!token) {
      logger.warn("Authorization token missing", {
        tenant,
        module: "auth",
        event: "auth.authenticate",
        status: "fail",
        ip: req.ip,
      });
      res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
      return;
    }

    try {
      const decoded = verifyToken(token);
      const { User } = await getTenantModels(req);
      const user = await User.findById(decoded.id).select("-password");

      if (!user || !user.isActive) {
        logger.warn("Invalid or inactive user", {
          tenant,
          module: "auth",
          event: "auth.authenticate",
          status: "fail",
          userId: decoded.id,
          ip: req.ip,
        });
        res.status(401).json({
          success: false,
          message: "Invalid or inactive user",
        });
        return;
      }

      (req as AuthRequest).user = {
        id: user.id.toString(),
        _id: user.id.toString(),
        role: user.role,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
      };

      // --- Başarıyı loglama ---

      next();
    } catch (error: any) {
      logger.error("Invalid or expired token", {
        tenant,
        module: "auth",
        event: "auth.authenticate",
        status: "fail",
        error: error.message,
        ip: req.ip,
      });
      res.status(401).json({
        success: false,
        message:
          error.name === "TokenExpiredError"
            ? "Token expired"
            : "Invalid or expired token",
      });
      return;
    }
  }
);

export const authorizeRoles = (...roles: string[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthRequest).user;
    const tenant = req.tenant || "unknown";

    if (!user) {
      logger.warn("User not authenticated", {
        tenant,
        module: "auth",
        event: "auth.authorizeRoles",
        status: "fail",
        ip: req.ip,
      });
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    if (user.role === "superadmin") {
      logger.info("Superadmin override, role access granted", {
        tenant,
        module: "auth",
        event: "auth.authorizeRoles",
        status: "success",
        userId: user.id,
        userRole: user.role,
        requiredRoles: roles,
        ip: req.ip,
      });
      return next();
    }

    if (!roles.includes(user.role)) {
      logger.warn("Role access denied", {
        tenant,
        module: "auth",
        event: "auth.authorizeRoles",
        status: "fail",
        userId: user.id,
        userRole: user.role,
        requiredRoles: roles,
        ip: req.ip,
      });
      res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(", ")}`,
      });
      return;
    }

    // --- Başarıyı loglama ---
    next();
  };
};
