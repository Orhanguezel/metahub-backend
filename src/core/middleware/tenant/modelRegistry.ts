import { getTenantDbConnection } from "@/core/config/tenantDb";
import mongoose, { Schema, Model } from "mongoose";
import logger from "@/core/middleware/logger/logger";
import translations from "./i18n";
import { t } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";

// (Opsiyonel) Global model cache, multi-process ortamda memory leak olmasın diye limitli kullan.
const modelCache = new Map<string, Model<any>>();

/**
 * Tenant’a özel model: Connection ve model cache ile yeniden oluşturmayı engeller.
 */
export const getTenantModel = async <T = any>(
  tenant: string,
  modelName: string,
  schema: Schema<T>
): Promise<Model<T>> => {
  const locale = getLogLocale();
  const cacheKey = `${tenant}_${modelName}`;

  // Önce kendi global cache’inde var mı bak
  if (modelCache.has(cacheKey)) {
    logger.info(
      t("modelRegistry.cacheHit", locale, translations, { tenant, modelName }),
      {
        tenant,
        module: "modelRegistry",
        event: "cacheHit",
        status: "success",
        model: modelName,
      }
    );
    return modelCache.get(cacheKey)!;
  }

  // Tenant için bağlantı al
  const conn = await getTenantDbConnection(tenant);

  // Aynı connection üzerinde model tanımlı mı bak, varsa tekrar oluşturma!
  let model: Model<T>;
  if (conn.models[modelName]) {
    model = conn.models[modelName] as Model<T>;
  } else {
    model = conn.model<T>(modelName, schema);
  }

  modelCache.set(cacheKey, model);

  logger.info(
    t("modelRegistry.created", locale, translations, { tenant, modelName }),
    {
      tenant,
      module: "modelRegistry",
      event: "createModel",
      status: "success",
      model: modelName,
    }
  );

  return model;
};
