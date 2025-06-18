import path from "path";
import { getTenantDbConnection } from "@/core/config/tenantDb";
import { getTenantModelsFromConnection } from "@/core/middleware/tenant/getTenantModelsFromConnection";
import tenants from "@/core/middleware/tenant/tenants.json";
import { getEnvProfiles } from "@/tools/getEnvProfiles";
import { readAllEnvFiles } from "@/scripts/generateMeta/helpers/envHelpers";

import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/scripts/generateMeta/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";

/**
 * Her tenant için, sadece enabled modülleri aktif/deaktif eder.
 * Disabled olanları DB'de işaretler, dosya işlemlerini tenant klasöründe yapar.
 */
export const enforceEnabledModulesFromEnv = async () => {
  const lang: SupportedLocale = getLogLocale();
  const envProfiles = getEnvProfiles(); // ["anastasia", "metahub", ...]
  const envConfigs = readAllEnvFiles(envProfiles);

  for (const [profile, tenant] of Object.entries(tenants)) {
    logger.info(
      t("meta.enforce.start", lang, translations, { tenant, profile }),
      {
        tenant,
        module: "meta",
        event: "meta.enforce.start",
        status: "start",
        profile,
      }
    );

    const envVars = envConfigs[tenant];
    if (!envVars) {
      logger.warn(
        t("meta.enforce.noEnvConfig", lang, translations, { tenant, profile }),
        {
          tenant,
          module: "meta",
          event: "meta.enforce.noEnvConfig",
          status: "skip",
          profile,
        }
      );
      continue;
    }

    let conn: any = null;
    let models: any = null;
    try {
      conn = await getTenantDbConnection(tenant);
      models = getTenantModelsFromConnection(conn);

      const { ModuleSetting } = models;
      const enabledModules: string[] =
        envVars.ENABLED_MODULES?.split(",").map((m: string) => m.trim()) || [];

      let allSettings;
      try {
        allSettings = await ModuleSetting.find({ tenant });
      } catch (err) {
        logger.error(
          t("meta.enforce.moduleFetchError", lang, translations, { tenant }) +
            " " +
            String(err),
          {
            tenant,
            module: "meta",
            event: "meta.enforce.moduleFetchError",
            status: "fail",
            error: err,
          }
        );
        continue;
      }

      for (const setting of allSettings) {
        const isEnabled = enabledModules.includes(setting.module);
        if (setting.enabled !== isEnabled) {
          await ModuleSetting.updateOne(
            { tenant, module: setting.module },
            { $set: { enabled: isEnabled } }
          );
          logger.info(
            t("meta.enforce.updated", lang, translations, {
              module: setting.module,
              tenant,
              enabled: String(isEnabled),
            }),
            {
              tenant,
              module: "meta",
              event: "meta.enforceEnabledModulesFromEnv",
              status: "updated",
              moduleName: setting.module,
              enabled: isEnabled,
            }
          );
        }
      }
    } catch (err) {
      logger.error(
        t("meta.enforce.dbConnError", lang, translations, { tenant, profile }) +
          " " +
          String(err),
        {
          tenant,
          module: "meta",
          event: "meta.enforce.dbConnError",
          status: "fail",
          profile,
          error: err,
        }
      );
      continue;
    } finally {
      if (conn) {
        // Bağlantı mongoose global pool'a aitse kapama!
        // Eğer gerçekten her tenant ayrı mongoose connection ise kapat:
        try {
          await conn.close();
        } catch (e) {
          logger.warn(
            `[enforceEnabledModulesFromEnv] Connection close failed: ${tenant}`,
            { tenant, module: "meta", event: "meta.conn.close", error: e }
          );
        }
      }
    }

    logger.info(
      t("meta.enforce.completed", lang, translations, { tenant, profile }),
      {
        tenant,
        module: "meta",
        event: "meta.enforceCompleted",
        status: "success",
        profile,
      }
    );
  }
};
