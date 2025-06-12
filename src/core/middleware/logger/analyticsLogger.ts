import { Request, Response, NextFunction } from "express";
import { Analytics } from "@/modules/analytics";
import geoip from "geoip-lite";
import { ModuleSetting } from "@/modules/admin";
import logger from "@/core/middleware/logger/logger";

export const analyticsLogger = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pathParts = req.originalUrl.split("/").filter(Boolean);
    const moduleName = pathParts[1]?.toLowerCase() || "unknown";
    const project = process.env.APP_ENV;

    // 🧠 Module ayarı kontrolü (multi-tenant uyumlu)
    const setting = await ModuleSetting.findOne({ module: moduleName, project });

    if (!setting || setting.useAnalytics !== true) {
      return next(); // ⏭️ Analytics pasifse atla
    }

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
    const uploadedFiles = files.map((file) => file.filename);

    const ip =
      req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
      req.socket?.remoteAddress ||
      req.ip ||
      "";

    const geo = geoip.lookup(ip);

    const analyticsData = {
      userId: (req as any).user?._id || null,
      path: req.originalUrl,
      method: req.method,
      ip,
      country: geo?.country,
      city: geo?.city,
      location: geo?.ll ? { type: "Point", coordinates: [geo.ll[1], geo.ll[0]] } : undefined,
      userAgent: req.headers["user-agent"] || "",
      query: req.query,
      body: req.method !== "GET" ? req.body : undefined,
      module: moduleName,
      eventType,
      uploadedFiles: uploadedFiles.length > 0 ? uploadedFiles : undefined,
      status: res.statusCode,
      locale: (req as any).locale || "en",
      timestamp: new Date(),
    };

    await Analytics.create(analyticsData);

    // 📘 Terminal ve JSON log
    logger.info("Analytics event logged", {
      module: moduleName,
      project,
      eventType,
      path: req.originalUrl,
      ip,
      location: analyticsData.location,
    });

  } catch (error) {
    logger.error("Analytics logging failed", { error });
  }

  next();
};
