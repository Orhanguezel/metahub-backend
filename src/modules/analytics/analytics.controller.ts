// src/modules/analytics/analytics.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { SupportedLocale } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { isValidObjectId, validateJsonField } from "@/core/utils/validation";

/* ----------------- Helpers ----------------- */
const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

// numeric coerce
function toNumber(v: any, d?: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function isValidPoint(loc: any): loc is { type: "Point"; coordinates: [number, number] } {
  return (
    loc &&
    loc.type === "Point" &&
    Array.isArray(loc.coordinates) &&
    loc.coordinates.length === 2 &&
    typeof loc.coordinates[0] === "number" &&
    typeof loc.coordinates[1] === "number"
  );
}

// request dilini (string) çözümler — tByReq’i değiştirmiyoruz
function resolveLanguageStr(req: Request): SupportedLocale {
  return ((req.locale as SupportedLocale) || getLogLocale()) as SupportedLocale;
}

/* ---------------- controllers ---------------- */

// POST /analytics/events
export const createAnalyticsEvent = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const language = resolveLanguageStr(req);
  const ctx = getRequestContext(req);

  const { Analytics, ModuleSetting } = await getTenantModels(req);

  const project = process.env.APP_ENV || (ctx as any)?.project || undefined;
  const body = { ...(req.body || {}) };

  // quick validations
  if (!body?.module) {
    res.status(400).json({ success: false, message: "Module is required." });
    return;
  }
  if (!project) {
    res.status(400).json({ success: false, message: "Project is missing." });
    return;
  }
  if (body.userId && !isValidObjectId(body.userId)) {
    res.status(400).json({ success: false, message: "Invalid userId." });
    return;
  }

  // JSON alanları güvenli parse
  try {
    body.query = validateJsonField(body.query, "query");
    body.body = validateJsonField(body.body, "body");
    body.meta = validateJsonField(body.meta, "meta");
  } catch (err: any) {
    res.status(400).json({ success: false, message: err?.message || "Invalid JSON." });
    return;
  }

  // legacy -> GeoJSON
  if (body.location && typeof body.location === "object" && "lat" in body.location && "lon" in body.location) {
    const lon = toNumber(body.location.lon);
    const lat = toNumber(body.location.lat);
    if (Number.isFinite(lon) && Number.isFinite(lat)) {
      body.location = { type: "Point", coordinates: [lon, lat] };
    } else {
      delete body.location;
    }
  }
  if (body.location && !isValidPoint(body.location)) delete body.location;

  // analytics açık mı?
  const ms = await ModuleSetting.findOne({
    tenant: (req as any).tenant,
    module: body.module,
    project,
  })
    .select("useAnalytics enabled")
    .lean();

  if (!ms || ms.enabled === false || ms.useAnalytics !== true) {
    logger.withReq.info(req, t("Analytics disabled or module not found:"), {
      module: body.module,
      project,
    });
    res.status(204).send(); // No Content
    return;
  }

  // ctx’ten geo varsa öncelik ver
  let finalLocation = body.location;
  if (ctx.location && isValidPoint(ctx.location)) {
    finalLocation = ctx.location;
  }

  const doc = await Analytics.create({
    ...body,
    project,
    tenant: (req as any).tenant,
    language,
    userId: body.userId || ctx.userId || undefined,
    ip: ctx.ip,
    country: ctx.country,
    city: ctx.city,
    userAgent: ctx.userAgent,
    timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
    ...(finalLocation ? { location: finalLocation } : {}),
  });

  logger.withReq.info(req, t("analytics.event_created"), {
    module: doc.module,
    eventType: doc.eventType,
    tenant: (req as any).tenant,
    project,
    language,
  });

  res.status(201).json({ success: true, message: "Event logged", data: doc });
});

// GET /analytics/events
export const getAnalyticsEvents = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const language = resolveLanguageStr(req);
  const q = req.query as any;

  const limit = Math.min(toNumber(q.limit, 100)!, 1000);
  const skip = toNumber(q.skip, 0)!;

  if (q.userId && !isValidObjectId(q.userId)) {
    res.status(400).json({ success: false, message: "Invalid userId." });
    return;
  }

  const filter: Record<string, any> = {
    tenant: (req as any).tenant,
    ...(q.project ? { project: q.project } : {}),
    ...(q.module ? { module: q.module } : {}),
    ...(q.eventType ? { eventType: q.eventType } : {}),
    ...(q.userId ? { userId: q.userId } : {}),
    ...(q.path ? { path: q.path } : {}),
    ...(q.method ? { method: q.method } : {}),
    ...(q.country ? { country: q.country } : {}),
    ...(q.city ? { city: q.city } : {}),
    ...(q.status ? { status: toNumber(q.status) } : {}),
    // Dil filtresi sadece explicit istendiyse uygula:
    ...(q.language ? { language } : {}),
  };

  // tarih aralığı (startDate/endDate veya from/to)
  const start = q.startDate || q.from;
  const end = q.endDate || q.to;
  if (start || end) {
    filter.timestamp = {};
    if (start) filter.timestamp.$gte = new Date(String(start));
    if (end) filter.timestamp.$lte = new Date(String(end));
  }

  // GeoNear (simple $near)
  const nearLat = toNumber(q.nearLat);
  const nearLon = toNumber(q.nearLon);
  const nearDistance = toNumber(q.nearDistance, 50000);
  const geoQuery =
    Number.isFinite(nearLat) && Number.isFinite(nearLon)
      ? {
          location: {
            $near: {
              $geometry: { type: "Point", coordinates: [nearLon!, nearLat!] },
              $maxDistance: nearDistance!,
            },
          },
        }
      : {};

  const { Analytics } = await getTenantModels(req);

  const projection =
    q.fields && typeof q.fields === "string"
      ? q.fields.split(",").join(" ")
      : "_id tenant project module eventType timestamp location city country ip userAgent status path method title message language";

  const sort = typeof q.sort === "string" ? q.sort : "-timestamp";
  const queryObj = Object.keys(geoQuery).length ? { ...filter, ...geoQuery } : filter;

  const events = await Analytics.find(queryObj)
    .select(projection)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  logger.withReq.info(req, t("analytics.events_listed"), {
    filter: queryObj,
    count: events.length,
  });

  res.status(200).json({
    success: true,
    count: events.length,
    data: events,
  });
});

// GET /analytics/count
export const getAnalyticsCount = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const language = resolveLanguageStr(req);
  const q = req.query as any;

  if (q.userId && !isValidObjectId(q.userId)) {
    res.status(400).json({ success: false, message: "Invalid userId." });
    return;
  }

  const { Analytics } = await getTenantModels(req);

  const filter: Record<string, any> = {
    tenant: (req as any).tenant,
    ...(q.project ? { project: q.project } : {}),
    ...(q.module ? { module: q.module } : {}),
    ...(q.eventType ? { eventType: q.eventType } : {}),
    ...(q.userId ? { userId: q.userId } : {}),
    ...(q.country ? { country: q.country } : {}),
    ...(q.city ? { city: q.city } : {}),
    ...(q.language ? { language } : {}),
  };

  const count = await Analytics.countDocuments(filter);

  logger.withReq.info(req, t("analytics.event_count"), { filter, count });
  res.status(200).json({ success: true, count, filter });
});

// GET /analytics/trends
export const getEventTrends = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const language = resolveLanguageStr(req);
  const q = req.query as any;

  const { Analytics } = await getTenantModels(req);

  const match: Record<string, any> = {
    tenant: (req as any).tenant,
    ...(q.project ? { project: q.project } : {}),
    ...(q.module ? { module: q.module } : {}),
    ...(q.eventType ? { eventType: q.eventType } : {}),
    ...(q.language ? { language } : {}),
    ...(q.country ? { country: q.country } : {}),
    ...(q.city ? { city: q.city } : {}),
  };

  const start = q.startDate || q.from;
  const end = q.endDate || q.to;
  if (start || end) {
    match.timestamp = {};
    if (start) match.timestamp.$gte = new Date(String(start));
    if (end) match.timestamp.$lte = new Date(String(end));
  }

  const period = q.period === "month" ? "month" : "day";
  const groupId =
    period === "month"
      ? { year: { $year: "$timestamp" }, month: { $month: "$timestamp" } }
      : { year: { $year: "$timestamp" }, month: { $month: "$timestamp" }, day: { $dayOfMonth: "$timestamp" } };

  const trends = await Analytics.aggregate([
    { $match: match },
    { $group: { _id: groupId, total: { $sum: 1 } } },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
  ]);

  logger.withReq.info(req, t("analytics.event_trends"), {
    match,
    period,
    count: trends.length,
  });

  res.status(200).json({ success: true, period, data: trends });
});

// DELETE /analytics/events
export const deleteAnalyticsEvents = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const language = resolveLanguageStr(req);
  const b = req.body as any;

  const { Analytics } = await getTenantModels(req);

  const filter: Record<string, any> = {
    tenant: (req as any).tenant,
    ...(b.project ? { project: b.project } : {}),
    ...(b.module ? { module: b.module } : {}),
    ...(b.eventType ? { eventType: b.eventType } : {}),
    ...(b.language ? { language } : {}),
    ...(b.country ? { country: b.country } : {}),
    ...(b.city ? { city: b.city } : {}),
  };

  if (b.beforeDate) filter.timestamp = { $lt: new Date(b.beforeDate) };

  const result = await Analytics.deleteMany(filter);

  logger.withReq.info(req, t("analytics.events_deleted"), {
    filter,
    deleted: result.deletedCount,
  });

  res.status(200).json({ success: true, deleted: result.deletedCount });
});
