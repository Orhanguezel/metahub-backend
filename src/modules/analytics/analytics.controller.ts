import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { Analytics } from "./analytics.models";

// 🚩 1. Yeni Event Kaydı (Track)
export const createAnalyticsEvent = asyncHandler(async (req: Request, res: Response) => {
  // (isteğe bağlı) Otomatik timestamp, userId çekilebilir
  const event = await Analytics.create({
    ...req.body,
    timestamp: req.body.timestamp || new Date(),
    userId: req.body.userId || (req.user?._id ?? null), // eğer auth middleware ile user varsa
  });
  res.status(201).json({ success: true, message: "Event logged", data: event });
});

// 🚩 2. Event Listesi (Tümünü veya filtreli getir)
export const getAnalyticsEvents = asyncHandler(async (req: Request, res: Response) => {
  const {
    limit = "100",
    skip = "0",
    module,
    eventType,
    userId,
    path,
    method,
    startDate,
    endDate,
    sort = "-timestamp",
  } = req.query;

  const filter: Record<string, any> = {};
  if (module) filter.module = module;
  if (eventType) filter.eventType = eventType;
  if (userId) filter.userId = userId;
  if (path) filter.path = path;
  if (method) filter.method = method;

  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate as string);
    if (endDate) filter.timestamp.$lte = new Date(endDate as string);
  }

  const events = await Analytics.find(filter)
    .sort(String(sort))
    .skip(Number(skip))
    .limit(Number(limit));

  res.status(200).json({
    success: true,
    count: events.length,
    data: events,
  });
});

// 🚩 3. Event Count (Basit sayma)
export const getAnalyticsCount = asyncHandler(async (req: Request, res: Response) => {
  const { module, eventType, userId } = req.query;
  const filter: Record<string, any> = {};
  if (module) filter.module = module;
  if (eventType) filter.eventType = eventType;
  if (userId) filter.userId = userId;

  const count = await Analytics.countDocuments(filter);

  res.status(200).json({
    success: true,
    count,
    filter,
  });
});

// 🚩 4. Event Trends (Tarihe göre trend: günlük/aylık)
export const getEventTrends = asyncHandler(async (req: Request, res: Response) => {
  const { module, eventType, period = "day", startDate, endDate } = req.query;

  // Tarih aralığı oluşturma
  const match: Record<string, any> = {};
  if (module) match.module = module;
  if (eventType) match.eventType = eventType;
  if (startDate || endDate) {
    match.timestamp = {};
    if (startDate) match.timestamp.$gte = new Date(startDate as string);
    if (endDate) match.timestamp.$lte = new Date(endDate as string);
  }

  let groupId;
  if (period === "month") {
    groupId = { year: { $year: "$timestamp" }, month: { $month: "$timestamp" } };
  } else {
    groupId = { year: { $year: "$timestamp" }, month: { $month: "$timestamp" }, day: { $dayOfMonth: "$timestamp" } };
  }

  const trends = await Analytics.aggregate([
    { $match: match },
    { $group: { _id: groupId, total: { $sum: 1 } } },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
  ]);

  res.status(200).json({
    success: true,
    period,
    data: trends,
  });
});

// 🚩 5. (Opsiyonel) Event Silme (temizlik için)
export const deleteAnalyticsEvents = asyncHandler(async (req: Request, res: Response) => {
  const { module, eventType, beforeDate } = req.body;
  const filter: Record<string, any> = {};
  if (module) filter.module = module;
  if (eventType) filter.eventType = eventType;
  if (beforeDate) filter.timestamp = { $lt: new Date(beforeDate) };

  const result = await Analytics.deleteMany(filter);
  res.status(200).json({
    success: true,
    deleted: result.deletedCount,
  });
});
