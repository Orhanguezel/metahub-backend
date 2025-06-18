import { getTenantDbConnection } from "@/core/config/tenantDb";
import mongoose from "mongoose";
import logger from "@/core/middleware/logger/logger";
import translations from "./i18n";
import { t } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";

// Global model cache
const modelCache = new Map<string, any>();

/**
 * Tenant’a özel model cache ve oluşturma
 */
export const getTenantModel = async <T>(
  tenant: string,
  modelName: string,
  schema: mongoose.Schema<T>
): Promise<mongoose.Model<T>> => {
  const locale = getLogLocale();
  const key = `${tenant}_${modelName}`;

  try {
    if (modelCache.has(key)) {
      logger.info(
        t("modelRegistry.cacheHit", locale, translations, {
          tenant,
          modelName,
        }),
        {
          tenant,
          module: "modelRegistry",
          event: "modelRegistry.cacheHit",
          status: "success",
          model: modelName,
        }
      );
      return modelCache.get(key);
    }

    const conn = await getTenantDbConnection(tenant);
    const model = conn.model<T>(modelName, schema);
    modelCache.set(key, model);

    logger.info(
      t("modelRegistry.created", locale, translations, { tenant, modelName }),
      {
        tenant,
        module: "modelRegistry",
        event: "modelRegistry.createModel",
        status: "success",
        model: modelName,
      }
    );

    return model;
  } catch (err) {
    logger.error(
      t("modelRegistry.error", locale, translations, { tenant, modelName }),
      {
        tenant,
        module: "modelRegistry",
        event: "modelRegistry.error",
        status: "fail",
        model: modelName,
        error: err,
      }
    );
    throw err;
  }
};
