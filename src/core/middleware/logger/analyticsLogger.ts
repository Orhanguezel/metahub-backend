import { Request, Response, NextFunction } from "express";
import geoip from "geoip-lite";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getTenantLogger } from "@/core/middleware/logger/tenantLogger";

export const analyticsLogger = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const tenant = req.tenant || "unknown";
  try {
    const pathParts = req.originalUrl.split("/").filter(Boolean);
    const moduleName = pathParts[1]?.toLowerCase() || "unknown";
    const project = process.env.APP_ENV;

    // Mutlaka tenant'ın kendi modelini çek!
    const { ModuleSetting, Analytics } = await getTenantModels(req);

    const setting = await ModuleSetting.findOne({
      module: moduleName,
      project,
      // tenant: req.tenant,  // Sadece aynı DB'de birden fazla tenant varsa ekle!
    });

    if (!setting || !setting.useAnalytics) return next();

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

    const files = Array.isArray(req.files) ? req.files : [];
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

    await Analytics.create(analyticsData);

    getTenantLogger(tenant).info("Analytics event logged", {
      ...analyticsData,
      project,
    });
  } catch (error) {
    getTenantLogger(tenant).error("Analytics logging failed", {
      error,
      tenant,
      path: req.originalUrl,
      method: req.method,
    });
  }

  next();
};
