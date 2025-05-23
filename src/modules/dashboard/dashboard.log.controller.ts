// src/modules/dashboard/dashboard.log.controller.ts

import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Analytics } from "@/modules/analytics"; // Model adını kontrol et!

// /api/dashboard/logs
export const getAnalyticsLogs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    limit = "100",
    module,
    eventType,
    userId,
    startDate,
    endDate,
  } = req.query;

  const filter: Record<string, any> = {};

  if (module) filter.module = module;
  if (eventType) filter.eventType = eventType;
  if (userId) filter.userId = userId;

  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate as string);
    if (endDate) filter.timestamp.$lte = new Date(endDate as string);
  }

  // Parse limit as integer and set max limit (ör: 1000)
  const parsedLimit = Math.min(parseInt(limit as string, 10) || 100, 1000);

  const logs = await Analytics.find(filter)
    .sort({ timestamp: -1 })
    .limit(parsedLimit);

  res.status(200).json({
    success: true,
    message: "Analytics logs fetched successfully.",
    count: logs.length,
    data: logs,
  });
});
