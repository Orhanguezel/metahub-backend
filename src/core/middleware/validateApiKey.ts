import { RequestHandler } from "express";
import { Apikey, ApiKeyLog } from "@/modules/apikey";

export const validateApiKey: RequestHandler = (req, res, next) => {
  const key = req.headers["x-api-key"] as string;

  if (!key) {
    res.status(401).json({
      success: false,
      message: "API key is missing.",
    });
    return; // ✅ void döndürür
  }

  Apikey.findOne({ key, status: "active" })
    .then(apiKey => {
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
        } catch (err) {
          console.error("API key log error:", err);
        }
      });

      apiKey.lastUsedAt = new Date();
      apiKey.save().catch(console.error);

      (req as any).apiKey = apiKey;
      next(); // ✅ void
    })
    .catch(error => {
      console.error("API key validation error:", error);
      res.status(500).json({ success: false, message: "Internal server error." });
    });
};
