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
      const connection = await getTenantDbConnection(tenantSlug);

      if (connection.models[modelName]) {
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
