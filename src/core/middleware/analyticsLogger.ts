import { Request, Response, NextFunction } from "express";
import AnalyticsEvent from "../../modules/analytics/analyticsEvent.models";

export const analyticsLogger = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const pathParts = req.originalUrl.split("/").filter(Boolean); // e.g. ["api", "products", "123"]

    const module = pathParts[1] || "unknown"; // "products", "orders", "cart"
    const eventType =
      req.method === "GET"
        ? "view"
        : req.method === "POST"
        ? "create"
        : req.method === "PUT" || req.method === "PATCH"
        ? "update"
        : req.method === "DELETE"
        ? "delete"
        : "other";

    await AnalyticsEvent.create({
      userId: (req as any).user?.id || null,
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      timestamp: new Date(),
      query: req.query,
      body: req.method !== "GET" ? req.body : undefined,
      module,
      eventType,
    });
  } catch (error) {
    console.error("Loglama hatası:", error);
  }

  next();
};
