// src/utils/cleanupModules.ts
import { ModuleMeta, ModuleSetting } from "@/modules/admin";
import { getEnabledModulesFromEnv } from "./envHelpers";

/**
 * Deletes any modules from DB that are not listed in .env ENABLED_MODULES
 */
export const cleanupDisabledModules = async () => {
  const enabledModules = getEnabledModulesFromEnv();

  const allMetaModules = await ModuleMeta.find({});
  const metaModulesToDelete = allMetaModules
    .map((m) => m.name)
    .filter((name) => !enabledModules.includes(name));

  const allSettings = await ModuleSetting.find({});
  const settingModulesToDelete = allSettings
    .map((s) => s.module)
    .filter((name) => !enabledModules.includes(name));

  // Temizleme işlemleri
  if (metaModulesToDelete.length > 0) {
    await ModuleMeta.deleteMany({ name: { $in: metaModulesToDelete } });
    console.log("🧹 Deleted META modules:", metaModulesToDelete.join(", "));
  }

  if (settingModulesToDelete.length > 0) {
    await ModuleSetting.deleteMany({ module: { $in: settingModulesToDelete } });
    console.log("🧹 Deleted SETTING modules:", settingModulesToDelete.join(", "));
  }
};
