import fs from "fs";
import path from "path";
import { ModuleMeta, ModuleSetting } from "@/modules/admin";
import { getEnvProfiles } from "@/tools/getEnvProfiles";
import { readAllEnvFiles } from "./envHelpers";

export const cleanupDisabledModules = async () => {
  const profiles = getEnvProfiles();
  const envConfigs = readAllEnvFiles(profiles);

  for (const profile of profiles) {
    const envVars = envConfigs[profile];
    const enabledModules: string[] = envVars.ENABLED_MODULES?.split(",").map((m) => m.trim()) || [];

    const allModuleSettings = await ModuleSetting.find({ project: profile });

    const currentModules = allModuleSettings.map((s) => s.module);

    const toDelete = currentModules.filter((mod) => !enabledModules.includes(mod));

    if (toDelete.length === 0) continue;

    const metaProjectDir = path.join(process.cwd(), `src/meta-configs/${profile}`);

    for (const mod of toDelete) {
      console.log(`🧨 Deleting disabled module "${mod}" from profile "${profile}"`);

      // 1. Sil: Veritabanı kayıtları
      await ModuleMeta.deleteOne({ name: mod });
      await ModuleSetting.deleteMany({ module: mod, project: profile });

      // 2. Sil: meta-config dosyası
      const metaPath = path.join(metaProjectDir, `${mod}.meta.json`);
      if (fs.existsSync(metaPath)) {
        fs.unlinkSync(metaPath);
        console.log(`🗑️ Deleted meta file: ${metaPath}`);
      }
    }
  }
};
