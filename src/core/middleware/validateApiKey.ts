import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import logger from "@/core/middleware/logger/logger";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";

// Logger ve çeviri helper'ı
function getI18nTools(req: Request) {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) =>
    translate(key, locale, translations, params);
  const logContext = {
    tenant: req.tenant,
    module: "apikey",
    path: req.path,
    method: req.method,
    ip: req.ip,
  };
  return { locale, t, logContext };
}

export const validateApiKey = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { Apikey, Apikeylog } = await getTenantModels(req);
    const { t, logContext } = getI18nTools(req);
    const key = (req.headers["x-api-key"] || "").toString().trim();

    if (!key) {
      // Sadece hata durumunda logla (ve error seviyesinde)
      logger.error(t("apikey.error.missing"), {
        ...logContext,
        event: "apikey.validate",
        status: "fail",
      });
      res.status(401).json({
        success: false,
        message: t("apikey.error.missing"),
      });
      return;
    }

    const apiKey = await Apikey.findOne({ key, status: "active" });
    if (!apiKey) {
      logger.error(t("apikey.error.invalid"), {
        ...logContext,
        event: "apikey.validate",
        status: "fail",
      });
      res.status(403).json({
        success: false,
        message: t("apikey.error.invalid"),
      });
      return;
    }

    // Başarılı doğrulamada "info" veya "success" log YAZMA!
    // Sadece hata varsa yaz, yoksa sessizce devam et

    // Yanıt tamamlanınca sadece hata logla
    res.once("finish", async () => {
      try {
        await Apikeylog.create({
          apiKey: apiKey._id,
          route: req.originalUrl,
          method: req.method,
          statusCode: res.statusCode,
          ip: req.ip,
          userAgent: req.headers["user-agent"] || "",
        });
        // Info log: çok istenirse bırak, ama bu da çok gerekmiyor
        // logger.withReq.info(req,t("apikey.log.success"), { ...logContext, ... })
      } catch (error) {
        logger.error("[API key log error]", {
          ...logContext,
          event: "apikey.log",
          status: "fail",
          error: error instanceof Error ? error.message : error,
        });
      }
    });

    apiKey.lastUsedAt = new Date();
    // Hata varsa logla, başarıda log yazma
    await apiKey.save().catch((err) =>
      logger.error("[API key save error]", {
        ...logContext,
        event: "apikey.update",
        status: "fail",
        error: err instanceof Error ? err.message : err,
      })
    );

    (req as any).apiKey = apiKey;

    // logger.withReq.info(req,t("apikey.success.validated"), { ... })  // Artık yazılmıyor

    next();
  }
);
