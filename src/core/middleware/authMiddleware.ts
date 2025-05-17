import asyncHandler from "express-async-handler";
import { Request, Response, NextFunction, RequestHandler } from "express";
import User from "../../modules/users/users.models";
import { getTokenFromRequest } from "../utils/authHelpers";
import { verifyToken } from "../utils/token";
import { UserPayload } from "../../types/userPayload";

interface AuthRequest extends Request {
  user?: UserPayload;
}

// ✅ GÜNCELLENMİŞ authenticate
export const authenticate = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
      return;
    }
  }
);

// ✅ GÜNCELLENMİŞ authorizeRoles
export const authorizeRoles = (...roles: string[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
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

