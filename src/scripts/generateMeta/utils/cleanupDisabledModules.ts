import fs from "fs";
import path from "path";
import { ModuleMeta, ModuleSetting } from "@/modules/admin";
import { getEnvProfiles } from "@/tools/getEnvProfiles";
import { readAllEnvFiles } from "./envHelpers";

import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/scripts/generateMeta/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";

export const cleanupDisabledModules = async () => {
  const profiles = getEnvProfiles();
  const envConfigs = readAllEnvFiles(profiles);

  for (const profile of profiles) {
    const lang: SupportedLocale = getLogLocale();

    const envVars = envConfigs[profile];
    const enabledModules: string[] =
      envVars.ENABLED_MODULES?.split(",").map((m) => m.trim()) || [];

    const allModuleSettings = await ModuleSetting.find({ project: profile });
    const currentModules = allModuleSettings.map((s) => s.module);

    const toDelete = currentModules.filter(
      (mod) => !enabledModules.includes(mod)
    );

    if (toDelete.length === 0) continue;

    const metaProjectDir = path.join(
      process.cwd(),
      `src/meta-configs/${profile}`
    );

    for (const mod of toDelete) {
      let didSomething = false;

      // 1. Veritabanı kayıtlarını sil ve gerçekten silindiyse logla
      const metaDel = await ModuleMeta.deleteOne({ name: mod });
      const settingDel = await ModuleSetting.deleteMany({
        module: mod,
        project: profile,
      });

      if (
        (metaDel.deletedCount && metaDel.deletedCount > 0) ||
        (settingDel.deletedCount && settingDel.deletedCount > 0)
      ) {
        logger.warn(
          t("meta.cleanup.deleting", lang, translations, { mod, profile })
        );
        logger.info(
          t("meta.cleanup.deletedDb", lang, translations, { mod, profile })
        );
        didSomething = true;
      }

      // 2. Dosya sil
      const metaPath = path.join(metaProjectDir, `${mod}.meta.json`);
      if (fs.existsSync(metaPath)) {
        fs.unlinkSync(metaPath);
        logger.info(
          t("meta.cleanup.deletedFile", lang, translations, { metaPath })
        );
        didSomething = true;
      }
    }
  }
};
