// src/core/middleware/analyticsLogger.ts
import { Request, Response, NextFunction } from "express";
import { Analytics } from "@/modules/analytics";
import geoip from "geoip-lite";
import { ModuleSetting } from "@/modules/admin";
import { getTenantLogger } from "@/core/middleware/logger/tenantLogger";

export const analyticsLogger = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Her zaman request üzerinden al
  const tenant = req.tenant || "unknown";
  try {
    const pathParts = req.originalUrl.split("/").filter(Boolean);
    const moduleName = pathParts[1]?.toLowerCase() || "unknown";
    const project = process.env.APP_ENV;

    // Multi-tenant module setting
    const setting = await ModuleSetting.findOne({
      module: moduleName,
      project,
    });

    if (!setting || setting.useAnalytics !== true) {
      return next(); // Analytics kapalıysa devam et
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
      tenant,
      userId: req.user?._id || null,
      path: req.originalUrl,
      method: req.method,
      ip,
      country: geo?.country,
      city: geo?.city,
      location: geo?.ll
        ? { type: "Point", coordinates: [geo.ll[1], geo.ll[0]] }
        : undefined,
      userAgent: req.headers["user-agent"] || "",
      query: req.query,
      body: req.method !== "GET" ? req.body : undefined,
      module: moduleName,
      eventType,
      uploadedFiles: uploadedFiles.length > 0 ? uploadedFiles : undefined,
      status: res.statusCode,
      locale: req.locale || "en",
      timestamp: new Date(),
    };

    // --- DB'ye kaydet (her zaman tenant alanı ile!)
    await Analytics.create(analyticsData);

    // --- Dosyaya ve terminale logla (tenant'a özel!)
    const tenantLogger = getTenantLogger(tenant);
    tenantLogger.info("Analytics event logged", {
      ...analyticsData, // Tam context!
      project,
    });
  } catch (error) {
    // Her zaman ilgili tenant logger'a yaz!
    const tenantLogger = getTenantLogger(req.tenant || "unknown");
    tenantLogger.error("Analytics logging failed", {
      error,
      tenant: req.tenant,
      path: req.originalUrl,
      method: req.method,
    });
  }

  next();
};
