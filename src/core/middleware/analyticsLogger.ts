import { Request, Response, NextFunction } from "express";
import AnalyticsEvent from "@/modules/dashboard/analyticsEvent.models";

export const analyticsLogger = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pathParts = req.originalUrl.split("/").filter(Boolean);
    const moduleName = pathParts[1] || "unknown";

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

    const files = (req.files as Express.Multer.File[]) || [];

    // Collect filenames if any
    const uploadedFiles = files.map((file) => file.filename);

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
      uploadedFiles: uploadedFiles.length > 0 ? uploadedFiles : undefined, // ← add this field in DB
    });
  } catch (error) {
    console.error("Analytics logging failed:", error);
  }

  next();
};
