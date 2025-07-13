import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// 1️⃣ Event Kaydı (POST /analytics/events)
export const createAnalyticsEvent = asyncHandler(
  async (req: Request, res: Response) => {
    const ctx = getRequestContext(req);
    const language: SupportedLocale =
      req.body.language || req.body.locale || req.locale || "en";

    // Orijinal body clone
    const sanitizedBody = { ...req.body };

    // 1️⃣ Eğer eski { lat, lon } formatı gelirse GeoJSON Point'e çevir
    if (
      sanitizedBody.location &&
      typeof sanitizedBody.location === "object" &&
      typeof sanitizedBody.location.lat === "number" &&
      typeof sanitizedBody.location.lon === "number"
    ) {
      sanitizedBody.location = {
        type: "Point",
        coordinates: [
          sanitizedBody.location.lon,
          sanitizedBody.location.lat,
        ], // GeoJSON: [lon, lat]
      };
    }

    // 2️⃣ Body'deki hatalı location verisini sil
    if (
      sanitizedBody.location &&
      (sanitizedBody.location.type !== "Point" ||
        !Array.isArray(sanitizedBody.location.coordinates) ||
        sanitizedBody.location.coordinates.length !== 2 ||
        typeof sanitizedBody.location.coordinates[0] !== "number" ||
        typeof sanitizedBody.location.coordinates[1] !== "number")
    ) {
      delete sanitizedBody.location;
    }

    // 🔍 Analytics açık mı kontrol et
    const moduleName = sanitizedBody.module;
    const project = process.env.APP_ENV;
    const { Analytics, ModuleSetting } = await getTenantModels(req);

    if (!moduleName || !project) {
      res.status(400).json({
        success: false,
        message: "Module name or project is missing.",
      });
      return;
    }

    const moduleSetting = await ModuleSetting.findOne({
      module: moduleName,
      tenant: req.tenant,
      project,
    });

    if (!moduleSetting || !moduleSetting.useAnalytics) {
      logger.info("Analytics disabled or module not found:", {
        module: moduleName,
        project,
      });
      res.status(204).send();
      return; // No content
    }

    // 3️⃣ IP'den gelen location'ı kontrol et (override önceliği)
    let geoLocation:
      | { type: "Point"; coordinates: [number, number] }
      | undefined = undefined;
    if (
      ctx.location &&
      ctx.location.type === "Point" &&
      Array.isArray(ctx.location.coordinates) &&
      ctx.location.coordinates.length === 2 &&
      typeof ctx.location.coordinates[0] === "number" &&
      typeof ctx.location.coordinates[1] === "number"
    ) {
      geoLocation = ctx.location;
    }

    // 4️⃣ Final veri objesi (location sadece geçerliyse eklenecek!)
    const eventData: Record<string, any> = {
      ...sanitizedBody,
      timestamp: sanitizedBody.timestamp || new Date(),
      userId: sanitizedBody.userId || ctx.userId || undefined,
      ip: ctx.ip,
      country: ctx.country,
      city: ctx.city,
      userAgent: ctx.userAgent,
      language,
      tenant: req.tenant,
    };

    if (geoLocation) {
      eventData.location = geoLocation;
    }

    // 5️⃣ Mongo'ya kaydet
    const event = await Analytics.create(eventData);

    logger.info("analytics.event_created", {
      module: event.module,
      eventType: event.eventType,
      userId: event.userId,
      ip: event.ip,
      country: event.country,
      city: event.city,
      location: event.location,
      language,
      timestamp: event.timestamp,
      tenant: req.tenant,
    });

    res.status(201).json({
      success: true,
      message: "Event logged",
      data: event,
    });
  }
);


// 2️⃣ Event Listesi (GET /analytics/events)
export const getAnalyticsEvents = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      limit = "100",
      skip = "0",
      module,
      eventType,
      userId,
      path,
      method,
      country,
      city,
      status,
      language,
      startDate,
      endDate,
      sort = "-timestamp",
      nearLat,
      nearLon,
      nearDistance,
    } = req.query;

    const filter: Record<string, any> = { tenant: req.tenant };
    if (module) filter.module = module;
    if (eventType) filter.eventType = eventType;
    if (userId) filter.userId = userId;
    if (path) filter.path = path;
    if (method) filter.method = method;
    if (country) filter.country = country;
    if (city) filter.city = city;
    if (status) filter.status = Number(status);
    if (language) filter.language = language;

    // Coğrafi (geoNear) sorgu desteği (sadece tam geo location olanlar)
    let geoQuery = {};
    if (nearLat && nearLon) {
      geoQuery = {
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [Number(nearLon), Number(nearLat)],
            },
            $maxDistance: nearDistance ? Number(nearDistance) : 50000,
          },
        },
      };
    }

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(String(startDate));
      if (endDate) filter.timestamp.$lte = new Date(String(endDate));
    }

    const queryObj = Object.keys(geoQuery).length
      ? { ...filter, ...geoQuery }
      : filter;

    const { Analytics } = await getTenantModels(req);

    const events = await Analytics.find(queryObj, { tenant: req.tenant })
      .sort(String(sort))
      .skip(Number(skip))
      .limit(Math.min(Number(limit), 1000));

    logger.info("analytics.events_listed", {
      filter: queryObj,
      count: events.length,
    });
    res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  }
);

// 3️⃣ Event Sayısı (GET /analytics/count)
export const getAnalyticsCount = asyncHandler(
  async (req: Request, res: Response) => {
    const { module, eventType, userId, country, city, language, tenant } =
      req.query;
    const { Analytics } = await getTenantModels(req);
    const filter: Record<string, any> = { tenant: req.tenant };
    if (module) filter.module = module;
    if (eventType) filter.eventType = eventType;
    if (userId) filter.userId = userId;
    if (country) filter.country = country;
    if (city) filter.city = city;
    if (language) filter.language = language;

    const count = await Analytics.countDocuments(filter);

    logger.info("analytics.event_count", { filter, count });
    res.status(200).json({
      success: true,
      count,
      filter,
    });
  }
);

// 4️⃣ Event Trendleri (GET /analytics/trends)
export const getEventTrends = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      module,
      eventType,
      period = "day",
      startDate,
      endDate,
      language,
      tenant,
      country,
      city,
    } = req.query;
    const { Analytics } = await getTenantModels(req);

    const match: Record<string, any> = { tenant: req.tenant };
    if (module) match.module = module;
    if (eventType) match.eventType = eventType;
    if (language) match.language = language;
    if (country) match.country = country;
    if (city) match.city = city;
    if (tenant) match.tenant = tenant;
    if (startDate || endDate) {
      match.timestamp = {};
      if (startDate) match.timestamp.$gte = new Date(String(startDate));
      if (endDate) match.timestamp.$lte = new Date(String(endDate));
    }

    let groupId;
    if (period === "month") {
      groupId = {
        year: { $year: "$timestamp" },
        month: { $month: "$timestamp" },
      };
    } else {
      groupId = {
        year: { $year: "$timestamp" },
        month: { $month: "$timestamp" },
        day: { $dayOfMonth: "$timestamp" },
      };
    }

    const trends = await Analytics.aggregate([
      { $match: match },
      { $group: { _id: groupId, total: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    logger.info("analytics.event_trends", {
      match,
      period,
      count: trends.length,
    });
    res.status(200).json({
      success: true,
      period,
      data: trends,
    });
  }
);

// 5️⃣ Event Silme (DELETE /analytics/events)
export const deleteAnalyticsEvents = asyncHandler(
  async (req: Request, res: Response) => {
    const { module, eventType, beforeDate, language, country, city } = req.body;
    const { Analytics } = await getTenantModels(req);
    const filter: Record<string, any> = { tenant: req.tenant };
    if (module) filter.module = module;
    if (eventType) filter.eventType = eventType;
    if (language) filter.language = language;
    if (country) filter.country = country;
    if (city) filter.city = city;
    if (beforeDate) filter.timestamp = { $lt: new Date(beforeDate) };

    const result = await Analytics.deleteMany(filter);
    logger.info("analytics.events_deleted", {
      filter,
      deleted: result.deletedCount,
    });

    res.status(200).json({
      success: true,
      deleted: result.deletedCount,
    });
  }
);
