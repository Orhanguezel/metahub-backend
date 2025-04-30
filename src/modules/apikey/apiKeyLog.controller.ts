import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { ApiKeyLog } from "./apikey.models";

// GET /apikey/:keyId/logs
export const getApiKeyLogs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { keyId } = req.params;

  const logs = await ApiKeyLog.find({ apiKey: keyId })
    .sort({ createdAt: -1 })
    .limit(100); // son 100 log

  res.status(200).json({
    success: true,
    message: "API key logs fetched successfully.",
    data: logs,
  });

  return;
});
