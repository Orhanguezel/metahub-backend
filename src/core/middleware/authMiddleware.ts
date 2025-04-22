// src/middleware/authMiddleware.ts
import asyncHandler from "express-async-handler";
import { Request, Response, NextFunction } from "express";
import User from "../../modules/user/user.models";
import { getTokenFromRequest } from "../utils/authHelpers";
import { verifyToken } from "../utils/token";

export const authenticate = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = getTokenFromRequest(req);

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
      return;
    }

    try {
      const decoded = verifyToken(token);

      if (!decoded?.id) {
        res.status(401).json({
          success: false,
          message: "Invalid token payload",
        });
        return;
      }

      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        res.status(401).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      if (!user.isActive) {
        res.status(403).json({
          success: false,
          message: "Account is deactivated",
        });
        return;
      }

      req.user = {
        id: user.id.toString(),
        _id: user.id.toString(),
        role: user.role,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
      };

      next();
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        res.status(401).json({
          success: false,
          message: "Token expired",
        });
        return;
      }

      res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }
  }
);

// 🔐 Rol bazlı yetki kontrolü
export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(", ")}`,
      });
      return;
    }

    next();
  };
};
