import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/scripts/generateMeta/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";

export type EnvConfig = Record<string, string>;

/**
 * Tüm .env.{profile} dosyalarını okuyup tenant-context ile döndürür.
 * Okunan dosya ve oluşan error logları, hangi tenant içinse ona yazar.
 */
export function readAllEnvFiles(
  tenantList: string[]
): Record<string, EnvConfig> {
  const envConfigs: Record<string, EnvConfig> = {};
  const lang: SupportedLocale = getLogLocale();

  for (const tenant of tenantList) {
    const envPath = path.resolve(process.cwd(), `.env.${tenant}`);

    if (!fs.existsSync(envPath)) {
      logger.warn(t("meta.env.notFound", lang, translations, { tenant }), {
        tenant,
        module: "meta",
        event: "meta.env.notFound",
        status: "notfound",
        envPath,
      });
      continue;
    }

    try {
      const parsed = dotenv.parse(fs.readFileSync(envPath));
      envConfigs[tenant] = parsed;
      logger.info(t("meta.env.readSuccess", lang, translations, { tenant }), {
        tenant,
        module: "meta",
        event: "meta.env.readSuccess",
        status: "success",
        envPath,
      });
    } catch (err) {
      logger.error(
        t("meta.env.readFail", lang, translations, { tenant }) +
          " " +
          String(err),
        {
          tenant,
          module: "meta",
          event: "meta.env.readFail",
          status: "fail",
          envPath,
          error: err,
        }
      );
    }
  }

  return envConfigs;
}
