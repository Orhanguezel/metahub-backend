import { ModuleSetting } from "@/modules/admin";
import { getEnvProfiles } from "@/tools/getEnvProfiles";
import { readAllEnvFiles } from "./envHelpers";

import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/scripts/generateMeta/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";

/**
 * Silinmeyen ama devre dışı bırakılacak modülleri işaretler.
 * (Sadece enabled/deaktif flag'ini günceller.)
 */
export const enforceEnabledModulesFromEnv = async () => {
  const profiles = getEnvProfiles();
  const envConfigs = readAllEnvFiles(profiles);

  for (const profile of profiles) {
    const lang = getLogLocale();
    const envVars = envConfigs[profile];
    const enabledModules =
      envVars.ENABLED_MODULES?.split(",").map((m) => m.trim()) || [];

    const allSettings = await ModuleSetting.find({ project: profile });

    for (const setting of allSettings) {
      const isEnabled = enabledModules.includes(setting.module);
      if (setting.enabled !== isEnabled) {
        await ModuleSetting.updateOne(
          { project: profile, module: setting.module },
          { $set: { enabled: isEnabled } }
        );
        logger.info(
          t("meta.enforce.updated", lang, translations, {
            module: setting.module,
            profile,
            enabled: String(isEnabled),
          })
        );
      }
    }
  }
};
