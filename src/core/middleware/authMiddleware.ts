import asyncHandler from "express-async-handler";
import { Request, Response, NextFunction, RequestHandler } from "express";
import User from "../../modules/users/users.models";
import { getTokenFromRequest } from "../utils/authHelpers";
import { verifyToken } from "../utils/token";
import { UserPayload } from "../../types/express"; // Yol doğruysa

// Geçici tip: Express'e uyumlu ama genişletilmiş
interface AuthRequest extends Request {
  user?: UserPayload;
}

// ✅ authenticate fonksiyonunu `RequestHandler` olarak tanımla
export const authenticate: RequestHandler = asyncHandler(
  async (req, res, next) => {
    const token = getTokenFromRequest(req);

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
      return; // ✅ sadece return, response'u bitiriyor
    }

    try {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id).select("-password");

      if (!user || !user.isActive) {
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

      next();
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message:
          error.name === "TokenExpiredError"
            ? "Token expired"
            : "Invalid or expired token",
      });
      return; // ✅ yine sadece return
    }
  }
);

export const authorizeRoles = (...roles: string[]): RequestHandler => {
  return (req, res, next) => {
    const user = (req as AuthRequest).user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    if (!roles.includes(user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(", ")}`,
      });
      return;
    }

    next();
  };
};
