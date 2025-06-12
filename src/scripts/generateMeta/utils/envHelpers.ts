import fs from "fs";
import path from "path";
import dotenv from "dotenv";

import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/scripts/generateMeta/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";

export type EnvConfig = Record<string, string>;

export function readAllEnvFiles(profiles: string[]): Record<string, EnvConfig> {
  const envConfigs: Record<string, EnvConfig> = {};
  const lang = getLogLocale();

  for (const profile of profiles) {
    const envPath = path.resolve(process.cwd(), `.env.${profile}`);
    if (!fs.existsSync(envPath)) continue;

    try {
      const parsed = dotenv.parse(fs.readFileSync(envPath));
      envConfigs[profile] = parsed;
    } catch (err) {
      logger.error(
        t("meta.env.readFail", lang, translations, { profile }) +
          " " +
          String(err)
      );
    }
  }

  return envConfigs;
}
