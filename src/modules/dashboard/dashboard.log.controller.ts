// src/modules/dashboard/dashboard.log.controller.ts

import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// ✅ GET /api/dashboard/logs
export const getAnalyticsLogs = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const {
      limit = "100",
      module,
      eventType,
      userId,
      country,
      city,
      language,
      path,
      method,
      startDate,
      endDate,
    } = req.query;

    const filter: Record<string, any> = { tenant: req.tenant };

    // 🔍 Filtreler (isteğe bağlı)
    if (module) filter.module = module;
    if (eventType) filter.eventType = eventType;
    if (userId) filter.userId = userId;
    if (country) filter.country = country;
    if (city) filter.city = city;
    if (language) filter.language = language;
    if (path) filter.path = path;
    if (method) filter.method = method;

    // 🗓️ Tarih aralığı (opsiyonel)
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate as string);
      if (endDate) filter.timestamp.$lte = new Date(endDate as string);
    }

    // 🔢 Maksimum 1000 kayıt
    const parsedLimit = Math.min(parseInt(limit as string, 10) || 100, 1000);

    // 📦 Veriyi çek
    const { Analytics } = await getTenantModels(req);
    const logs = await Analytics.find(filter)
      .sort({ timestamp: -1 })
      .limit(parsedLimit);

    res.status(200).json({
      success: true,
      message: "Analytics logs fetched successfully.",
      count: logs.length,
      data: logs,
    });
  }
);
