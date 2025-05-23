import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { ApiKeyLog } from "@/modules/apikey";

// GET /apikey/:keyId/logs
export const getApiKeyLogs = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { keyId } = req.params;

    const logs = await ApiKeyLog.find({ apiKey: keyId })
      .sort({ createdAt: -1 })
      .limit(100); // last 100 logs

    res.status(200).json({
      success: true,
      message: "API key logs fetched successfully.",
      data: logs,
    });
    return;
  } catch (error) {
    next(error);
  }
});

