// src/core/middleware/tenant/injectTenantModel.ts
import { Request, Response, NextFunction } from "express";
import { getTenantModel } from "@/core/middleware/tenant/modelRegistry";
import { Schema } from "mongoose";
import { resolveTenantFromRequest } from "./resolveTenant";
import logger from "@/core/middleware/logger/logger";
import translations from "./i18n";
import { t } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";

/**
 * Her istekte tenant belirler ve req üstüne dinamik tenant-aware getModel fonksiyonu ekler.
 * - tenant, header/domain ile tespit edilir
 * - Hatalar descriptive, log ve response ile döner
 */
export const injectTenantModel = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. Tenant tespit
    const tenant = resolveTenantFromRequest(req);
    req.tenant = tenant;

    // 2. Dinamik model injection (her modül kendi schema'sını verir)
    req.getModel = async <T = any>(modelName: string, schema: Schema<T>) => {
      return getTenantModel<T>(tenant, modelName, schema);
    };

    // 3. Tenant ve i18n log
    logger.info(
      t("resolveTenant.success", req.locale || getLogLocale(), translations, {
        tenant,
      }),
      {
        tenant,
        ...getRequestContext(req),
        module: "tenant",
        event: "tenant.resolveTenant",
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
    // Hatalı tenant veya resolve hatası
    logger.error(
      t("resolveTenant.fail", req.locale || getLogLocale(), translations),
      {
        tenant: req.tenant || "unknown",
        ...getRequestContext(req),
        module: "tenant",
        event: "tenant.resolveTenant",
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
