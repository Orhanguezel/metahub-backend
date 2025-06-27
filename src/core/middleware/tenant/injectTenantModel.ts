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
      return connection.model<T>(modelName, schema);
    };

    next();
  } catch (err: any) {
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
