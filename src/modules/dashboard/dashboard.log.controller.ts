// src/controllers/dashboard/dashboard.log.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import AnalyticsEvent from "./analyticsEvent.models";

// /api/dashboard/logs
export const getAnalyticsLogs = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      limit = 100,
      module,
      eventType,
      userId,
      startDate,
      endDate,
    } = req.query;

    const filter: any = {};

    if (module) filter.module = module;
    if (eventType) filter.eventType = eventType;
    if (userId) filter.userId = userId;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate as string);
      if (endDate) filter.timestamp.$lte = new Date(endDate as string);
    }

    const logs = await AnalyticsEvent.find(filter)
      .sort({ timestamp: -1 })
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: logs.length,
      message: "Analytics logs fetched successfully",
      data: logs,
    });
  }
);
