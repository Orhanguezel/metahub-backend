// src/core/config/tenantDb.ts
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import dotenvParse from "dotenv-parse-variables";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";

const connections: Record<string, mongoose.Connection> = {};

/**
 * Her tenant için izole DB connection açar, cache'den döner.
 */
export const getTenantDbConnection = async (
  tenant: string
): Promise<mongoose.Connection> => {
  const locale = getLogLocale();

  if (connections[tenant]) {
    logger.info(t("tenantDb.connected", locale, translations, { tenant }), {
      tenant,
      module: "tenantDb",
      event: "tenantDb.cachedConnection",
      status: "cached",
    });
    return connections[tenant];
  }

  const envPath = path.resolve(process.cwd(), `.env.${tenant}`);
  logger.info(t("tenantDb.envPath", locale, translations, { envPath }), {
    tenant,
    module: "tenantDb",
    event: "tenantDb.envPath",
    status: "init",
    path: envPath,
  });

  if (!fs.existsSync(envPath)) {
    logger.error(t("tenantDb.missingEnv", locale, translations, { tenant }), {
      tenant,
      module: "tenantDb",
      event: "tenantDb.missingEnv",
      path: envPath,
      status: "fail",
    });
    throw new Error(t("tenantDb.missingEnv", locale, translations, { tenant }));
  }

  const raw = fs.readFileSync(envPath, "utf8");
  const parsed = dotenv.parse(raw);
  const tenantEnv = dotenvParse(parsed);

  const uri = tenantEnv.MONGO_URI;
  if (!uri) {
    logger.error(t("tenantDb.missingUri", locale, translations, { tenant }), {
      tenant,
      module: "tenantDb",
      event: "tenantDb.missingUri",
      status: "fail",
    });
    throw new Error(t("tenantDb.missingUri", locale, translations, { tenant }));
  }

  logger.info(t("tenantDb.connecting", locale, translations, { tenant }), {
    tenant,
    module: "tenantDb",
    event: "tenantDb.connecting",
    mongoUri: uri,
    status: "connecting",
  });

  const conn = mongoose.createConnection(uri, {
    bufferCommands: false,
    autoCreate: true,
  });

  await new Promise<void>((resolve, reject) => {
    conn.once("open", () => {
      logger.info(t("tenantDb.connected", locale, translations, { tenant }), {
        tenant,
        module: "tenantDb",
        event: "tenantDb.connected",
        status: "success",
      });
      connections[tenant] = conn;
      resolve();
    });

    conn.on("error", (err) => {
      logger.error(
        t("tenantDb.connectionFail", locale, translations, { tenant }),
        {
          tenant,
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
