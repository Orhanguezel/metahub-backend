// src/core/middleware/tenant/injectTenantModel.ts
import { Request, Response, NextFunction } from "express";
import { getTenantDbConnection } from "@/core/config/tenantDb";
import logger from "@/core/middleware/logger/logger";
import translations from "./i18n";
import { t } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";

/**
 * Artık tenant resolve işlemi önde (resolveTenant middleware'ı ile) yapılıyor.
 * Bu middleware, tenant slug'ı ve tenant verisini req üstüne ekler.
 * Bu middleware sadece, dinamik model getter fonksiyonunu req'e inject eder.
 *
 * ÖNEMLİ: resolveTenant middleware'ı ÖNCE kullanılmalı!
 */
export const injectTenantModel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantSlug = req.tenant;
    if (!tenantSlug) {
      throw new Error(
        "Tenant slug not found on request object. (Did you forget to use resolveTenant middleware?)"
      );
    }

    // Dinamik tenant connection'dan model getter fonksiyonunu ekle
    req.getModel = async <T = any>(modelName: string, schema: any) => {
      const connection = await getTenantDbConnection(tenantSlug);
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
    next();
  } catch (err: any) {
    logger.error(
      t("resolveTenant.fail", req.locale || getLogLocale(), translations),
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
    res.status(400).json({
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
