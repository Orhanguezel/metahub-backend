
import { Request, Response, NextFunction } from "express";
import AnalyticsEvent from "@/modules/dashboard/analyticsEvent.models";

export const analyticsLogger = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Split path: e.g., /api/products/123 → ["api", "products", "123"]
    const pathParts = req.originalUrl.split("/").filter(Boolean);

    // Detect module name (products, orders, etc.), default to "unknown"
    const moduleName = pathParts[1] || "unknown";

    // Determine event type based on HTTP method
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

    // Create log entry
    await AnalyticsEvent.create({
      userId: (req as any).user?._id || null,
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      query: req.query,
      body: req.method !== "GET" ? req.body : undefined,
      module: moduleName,
      eventType,
    });
  } catch (error) {
    console.error("Analytics logging failed:", error);
    // Never block the request even if logging fails
  }

  next();
};
