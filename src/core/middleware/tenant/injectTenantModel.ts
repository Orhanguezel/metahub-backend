import { Request, Response, NextFunction } from "express";
import { getTenantDbConnection } from "@/core/config/tenantDb";
import logger from "@/core/middleware/logger/logger";
import translations from "./i18n";
import { t } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";

/**
 * Dinamik model getter fonksiyonunu req objesine inject eder.
 * (resolveTenant'ın kesinlikle ÖNCE çalışması gerekir.)
 */
export const injectTenantModel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantSlug = req.tenant;

    logger.info(`[DEBUG] [INJECT_MODEL] Tenant çözümleme başlatıldı:`, {
      tenant: tenantSlug,
      headers: req.headers,
    });

    if (!tenantSlug) {
      logger.error(
        `[DEBUG] [INJECT_MODEL] Tenant slug eksik! resolveTenant çağrıldı mı?`,
        {
          tenant: "unknown",
          headers: req.headers,
        }
      );
      throw new Error(
        "Tenant slug not found on request object. (Did you forget to use resolveTenant middleware?)"
      );
    }

    req.getModel = async <T = any>(modelName: string, schema: any) => {
      logger.info(
        `[DEBUG] [INJECT_MODEL] Model getirme talebi: tenant=${tenantSlug}, modelName=${modelName}`,
        {
          tenant: tenantSlug,
          modelName,
        }
      );
      const connection = await getTenantDbConnection(tenantSlug);

      // Daha güvenli bir debug: Sadece veritabanı adı/log
      logger.info(
        `[DEBUG] [INJECT_MODEL] Bağlantı kurulan DB adı: ${connection.name}`,
        {
          tenant: tenantSlug,
          dbName: connection.name,
          host: connection.host,
          port: connection.port,
          // Eğer drivers[0] veya otherProperties varsa buraya ekleyebilirsin
        }
      );

      if (connection.models[modelName]) {
        logger.info(
          `[DEBUG] [INJECT_MODEL] Model tekrar kullanılacak: ${modelName} (tanımlıydı)`,
          { tenant: tenantSlug }
        );
        return connection.models[modelName] as any;
      }
      logger.info(
        `[DEBUG] [INJECT_MODEL] Model yeni oluşturuluyor: ${modelName}`,
        { tenant: tenantSlug }
      );
      return connection.model<T>(modelName, schema);
    };

    logger.info(
      t("resolveTenant.success", req.locale || getLogLocale(), translations, {
        tenant: tenantSlug,
      }),
      {
        tenant: tenantSlug,
        ...getRequestContext(req),
        module: "tenant",
        event: "tenant.injectTenantModel",
        status: "success",
        host: req.hostname,
        headers: {
          host: req.headers.host,
          "x-tenant": req.headers["x-tenant"],
        },
      }
    );

    logger.info(
      `[DEBUG] [INJECT_MODEL] Tenant model getter başarıyla eklendi.`,
      {
        tenant: tenantSlug,
      }
    );

    next();
  } catch (err: any) {
    logger.error(
      `[DEBUG] [INJECT_MODEL] HATA! Model inject edilemedi: ${
        err?.message || err
      }`,
      {
        tenant: req.tenant || "unknown",
        ...getRequestContext(req),
        module: "tenant",
        event: "tenant.injectTenantModel",
        status: "fail",
        error: err?.message || err,
        host: req.hostname,
        headers: {
          host: req.headers.host,
          "x-tenant": req.headers["x-tenant"],
        },
      }
    );
    res.status(500).json({
      success: false,
      message: t(
        "resolveTenant.fail",
        req.locale || getLogLocale(),
        translations
      ),
      detail: err?.message || err,
    });
  }
};
