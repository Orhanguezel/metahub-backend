// src/scripts/generateMeta/utils/enforceEnabledModules.ts
import { ModuleSetting } from "@/modules/admin";
import { getEnvProfiles } from "@/tools/getEnvProfiles";
import { readAllEnvFiles } from "./envHelpers";

/**
 * Silinmeyen ama devre dışı bırakılacak modülleri işaretler.
 */
export const enforceEnabledModulesFromEnv = async () => {
  const profiles = getEnvProfiles();
  const envConfigs = readAllEnvFiles(profiles);

  for (const profile of profiles) {
    const envVars = envConfigs[profile];
    const enabledModules = envVars.ENABLED_MODULES?.split(",").map((m) => m.trim()) || [];

    const allSettings = await ModuleSetting.find({ project: profile });

    for (const setting of allSettings) {
      const isEnabled = enabledModules.includes(setting.module);
      if (setting.enabled !== isEnabled) {
        await ModuleSetting.updateOne(
          { project: profile, module: setting.module },
          { $set: { enabled: isEnabled } }
        );
        console.log(
          `🔁 Updated "${setting.module}" in profile "${profile}" → enabled: ${isEnabled}`
        );
      }
    }
  }
};
