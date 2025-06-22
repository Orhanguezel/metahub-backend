// src/core/config/tenantDb.ts
import mongoose from "mongoose";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { Tenants } from "@/modules/tenants/tenants.model"; // Tenant modelin buradan import edilmeli

const connections: Record<string, mongoose.Connection> = {};

/**
 * Her tenant için izole DB connection açar, cache'den döner.
 * Artık bağlantı URI'sini .env.<tenant> yerine, veritabanındaki Tenants koleksiyonundan alır!
 */
export const getTenantDbConnection = async (
  tenantSlug: string
): Promise<mongoose.Connection> => {
  const locale = getLogLocale();

  // 1. Bağlantı cache'de varsa direkt dön
  if (connections[tenantSlug]) {
    if (process.env.NODE_ENV === "production") {
      logger.info(
        t("tenantDb.connected", locale, translations, { tenant: tenantSlug }),
        {
          tenant: tenantSlug,
          module: "tenantDb",
          event: "tenantDb.cachedConnection",
          status: "cached",
        }
      );
    } else {
      // Sadece debug log veya hiç loglama
      // logger.debug(...);
    }
    return connections[tenantSlug];
  }

  // 2. Tenant dokümanını çek
  const tenantDoc = await Tenants.findOne({ slug: tenantSlug }).lean();
  if (!tenantDoc) {
    logger.error(
      t("tenantDb.missingTenant", locale, translations, { tenant: tenantSlug }),
      {
        tenant: tenantSlug,
        module: "tenantDb",
        event: "tenantDb.missingTenant",
        status: "fail",
      }
    );
    throw new Error(
      t("tenantDb.missingTenant", locale, translations, { tenant: tenantSlug })
    );
  }

  // 3. mongoUri alanı zorunlu!
  const uri = tenantDoc.mongoUri;
  if (!uri) {
    logger.error(
      t("tenantDb.missingUri", locale, translations, { tenant: tenantSlug }),
      {
        tenant: tenantSlug,
        module: "tenantDb",
        event: "tenantDb.missingUri",
        status: "fail",
      }
    );
    throw new Error(
      t("tenantDb.missingUri", locale, translations, { tenant: tenantSlug })
    );
  }

  logger.info(
    t("tenantDb.connecting", locale, translations, { tenant: tenantSlug }),
    {
      tenant: tenantSlug,
      module: "tenantDb",
      event: "tenantDb.connecting",
      mongoUri: uri,
      status: "connecting",
    }
  );

  // 4. Bağlantı oluştur
  const conn = mongoose.createConnection(uri, {
    bufferCommands: false,
    autoCreate: true,
  });

  await new Promise<void>((resolve, reject) => {
    conn.once("open", () => {
      logger.info(
        t("tenantDb.connected", locale, translations, { tenant: tenantSlug }),
        {
          tenant: tenantSlug,
          module: "tenantDb",
          event: "tenantDb.connected",
          status: "success",
        }
      );
      connections[tenantSlug] = conn;
      resolve();
    });

    conn.on("error", (err) => {
      logger.error(
        t("tenantDb.connectionFail", locale, translations, {
          tenant: tenantSlug,
        }),
        {
          tenant: tenantSlug,
          module: "tenantDb",
          event: "tenantDb.connectionFail",
          error: err,
          status: "fail",
        }
      );
      reject(err);
    });
  });

  return conn;
};
