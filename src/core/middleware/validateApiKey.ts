import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { Apikey, ApiKeyLog } from "@/modules/apikey";

export const validateApiKey = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const key = req.headers["x-api-key"] as string;

  if (!key) {
    res.status(401).json({
      success: false,
      message: "API key is missing.",
    });
    return;
  }

  const apiKey = await Apikey.findOne({ key, status: "active" });

  if (!apiKey) {
    res.status(403).json({
      success: false,
      message: "Invalid or revoked API key.",
    });
    return;
  }

  res.once("finish", async () => {
    try {
      await ApiKeyLog.create({
        apiKey: apiKey._id,
        route: req.originalUrl,
        method: req.method,
        statusCode: res.statusCode,
        ip: req.ip,
        userAgent: req.headers["user-agent"] || "",
      });
    } catch (error) {
      console.error("API key log error:", error);
    }
  });

  apiKey.lastUsedAt = new Date();
  await apiKey.save().catch(console.error);

  (req as any).apiKey = apiKey;

  next();
});
