import mongoose from "mongoose";
import { getEnvProfiles } from "./getEnvProfiles";
import { getTenantDbConnection } from "@/core/config/tenantDb";
import { getTenantModelsFromConnection } from "@/core/middleware/tenant/getTenantModelsFromConnection";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/core/config/i18n";
import { SupportedLocale, TranslatedLabel } from "@/types/common";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { fillAllLocales } from "@/core/utils/i18n/parseMultilangField";

// 🌍 LOG_LOCALE veya fallback "en"
const lang: SupportedLocale = getLogLocale();

// 🔁 Migration Başlat
const runMigration = async () => {
  const tenantList = getEnvProfiles(); // Örn: ['metahub', 'anastasia', 'ensotek']

  for (const tenant of tenantList) {
    logger.info(`📦 Processing tenant: ${tenant}`, {
      tenant,
      module: "migration",
      status: "start",
    });

    try {
      const connection = await getTenantDbConnection(tenant);
      const { ModuleSetting } = getTenantModelsFromConnection(connection);

      const allModules = await ModuleSetting.find();

      for (const mod of allModules) {
        if (typeof mod.label === "string") {
          const newLabel: TranslatedLabel = fillAllLocales(mod.label);

          mod.label = newLabel;
          await mod.save();

          logger.info(
            t("migration.migrated", lang, translations, {
              module: mod.module,
            }) || `✅ Migrated [${tenant}]: ${mod.module}`,
            {
              tenant,
              module: "migration",
              status: "success",
            }
          );
        } else {
          logger.info(
            t("migration.alreadyMigrated", lang, translations, {
              module: mod.module,
            }) || `✔️ Already migrated [${tenant}]: ${mod.module}`,
            {
              tenant,
              module: "migration",
              status: "skipped",
            }
          );
        }
      }
    } catch (err) {
      logger.error(
        t("migration.error", lang, translations, {
          error: String(err),
        }) || `❌ Migration error for ${tenant}: ${err}`,
        { tenant, module: "migration", status: "fail", error: String(err) }
      );
    }
  }

  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
};

runMigration();
