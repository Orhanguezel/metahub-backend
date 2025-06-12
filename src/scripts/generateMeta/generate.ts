import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { connectDB } from "@/core/config/connect";
import { extractRoutesFromFile, getAllRouteFiles } from "./utils/extractRoutes";
import { updateMetaVersionLog } from "./utils/versionHelpers";
import { getEnvProfiles } from "@/tools/getEnvProfiles";
import { readAllEnvFiles } from "./utils/envHelpers";
import { metaConfig } from "./generateMeta.config";
import { getValidationBodySchema } from "./utils/validationSchemaReader";
import { enforceEnabledModulesFromEnv } from "./utils/enforceEnabledModules";
import { cleanupDisabledModules } from "./utils/cleanupDisabledModules";
import { fixMissingModuleSettings } from "./utils/fixMissingModuleSettings";
import { ModuleMeta, ModuleSetting } from "@/modules/admin";
import { normalizeMetaObject } from "./utils/normalizeMetaObject";

import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/scripts/generateMeta/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";

const lang: SupportedLocale = getLogLocale();
const profile = process.env.ACTIVE_META_PROFILE || process.env.APP_ENV || "en";

export const generateMeta = async () => {
  console.log(`[Meta] Generating meta-config for profile: ${profile}`);

  await connectDB();

  const modulesPath = path.resolve(process.cwd(), "src/modules");
  const metaProjectDir = path.resolve(
    process.cwd(),
    `src/meta-configs/${profile}`
  );

  if (!fs.existsSync(metaProjectDir)) {
    fs.mkdirSync(metaProjectDir, { recursive: true });
    logger.info(
      t("meta.dir.created", lang, translations, { dir: metaProjectDir })
    );
    console.log(`[Meta] Directory created: ${metaProjectDir}`);
  }

  const allModules = fs
    .readdirSync(modulesPath)
    .filter((mod) => fs.statSync(path.join(modulesPath, mod)).isDirectory());

  const existingMetaFiles = fs
    .readdirSync(metaProjectDir)
    .filter((f) => f.endsWith(".meta.json"));

  const modulesInFs = new Set(allModules);
  const envProfiles = getEnvProfiles();
  const envConfigs = readAllEnvFiles(envProfiles);

  // Orphan temizliği
  await Promise.all(
    existingMetaFiles.map(async (file) => {
      const modName = file.replace(".meta.json", "");
      if (!modulesInFs.has(modName)) {
        logger.warn(
          t("meta.orphan.found", lang, translations, { mod: modName })
        );
        try {
          fs.unlinkSync(path.join(metaProjectDir, file));
          logger.info(t("meta.orphan.deleted", lang, translations, { file }));
        } catch (err) {
          logger.error(
            t("meta.orphan.deleteFail", lang, translations, { mod: modName }) +
              " " +
              String(err)
          );
        }
        try {
          await ModuleMeta.deleteOne({ name: modName });
          await ModuleSetting.deleteMany({ module: modName });
          logger.info(
            t("meta.db.deleted", lang, translations, { mod: modName })
          );
        } catch (err) {
          logger.error(
            t("meta.db.deleteFail", lang, translations, { mod: modName }) +
              " " +
              String(err)
          );
        }
      }
    })
  );

  // Meta oluşturma
  await Promise.all(
    allModules.map(async (mod) => {
      if (metaConfig.ignoreModules.includes(mod)) {
        logger.warn(t("meta.ignoreModule", lang, translations, { mod }));
        if (["users", "order", "product"].includes(mod)) {
          console.log(`[Meta] Ignored module: ${mod}`);
        }
        return;
      }

      const modPath = path.join(modulesPath, mod);
      const routeFiles = getAllRouteFiles(modPath);

      if (routeFiles.length === 0) {
        logger.warn(t("meta.noRoutes", lang, translations, { mod }));
        return;
      }

      const metaPath = path.join(metaProjectDir, `${mod}.meta.json`);
      let existing = {};

      try {
        if (fs.existsSync(metaPath)) {
          const metaContent = fs.readFileSync(metaPath, "utf-8");
          existing = metaContent.trim() ? JSON.parse(metaContent) : {};
        }
      } catch (err) {
        logger.error(
          t("meta.file.parseFail", lang, translations, { metaPath }) +
            " " +
            String(err)
        );
        existing = {};
      }

      const routes = routeFiles.flatMap((routeFile) => {
        const fileRoutes = extractRoutesFromFile(routeFile);
        const filename = path.basename(routeFile);

        let prefix = "";
        if (filename !== "routes.ts" && filename.endsWith(".routes.ts")) {
          prefix = filename.replace(".routes.ts", "");
        }
        if (prefix === mod) prefix = "";

        return fileRoutes.map((route) => ({
          ...route,
          pathPrefix: prefix || undefined,
        }));
      });

      for (const route of routes) {
        if (route.validationName) {
          try {
            const bodySchema = await getValidationBodySchema(mod, route.path);
            if (bodySchema) {
              route.body =
                bodySchema.definitions?.[
                  Object.keys(bodySchema.definitions || {})[0]
                ] || bodySchema;
            }
          } catch (err) {
            logger.warn(
              t("meta.attachValidationFail", lang, translations, {
                summary: route.summary,
              })
            );
          }
        }
      }

      const rawMeta = {
        name: mod,
        ...existing,
        routes,
      };

      const normalizedMeta = normalizeMetaObject(rawMeta);
      const finalMeta = updateMetaVersionLog(normalizedMeta);

      try {
        fs.writeFileSync(metaPath, JSON.stringify(finalMeta, null, 2), "utf8");
      } catch (err) {
        logger.error(
          t("meta.meta.writeFail", lang, translations, { mod }) +
            " " +
            String(err)
        );
        console.error(`[Meta] [FAIL] Failed to write meta for ${mod}: ${err}`);
        return;
      }

      try {
        await ModuleMeta.updateOne(
          { name: mod },
          { $set: finalMeta },
          { upsert: true }
        );
      } catch (err) {
        logger.error(
          t("meta.db.updateFail", lang, translations, { mod }) +
            " " +
            String(err)
        );
      }

      if (routes.length > 0) {
        console.log(`[Meta] Generated meta: ${mod} (${routes.length} route)`);
      }
      logger.info(
        t("meta.success", lang, translations, { mod, count: routes.length })
      );
    })
  );

  await enforceEnabledModulesFromEnv();
  await cleanupDisabledModules();
  await fixMissingModuleSettings();

  mongoose.connection.close();
  console.log(`[Meta] Meta config generation finished.`);
  logger.info(t("meta.finished", lang, translations));
};
