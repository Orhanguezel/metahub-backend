// src/scripts/generateMeta/generateMeta.ts

import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { getTenantDbConnection } from "@/core/config/tenantDb";
import { getTenantModelsFromConnection } from "@/core/middleware/tenant/getTenantModelsFromConnection";
import {
  extractRoutesFromFile,
  getAllRouteFiles,
} from "./helpers/extractRoutes";
import { updateMetaVersionLog } from "./helpers/versionHelpers";
import { metaConfig } from "./configs/generateMeta.config";
import { getValidationBodySchema } from "./helpers/validationSchemaReader";
import { enforceEnabledModulesFromEnv } from "./helpers/enforceEnabledModules";
import { cleanupDisabledModules } from "./helpers/cleanupDisabledModules";
import { fixMissingModuleSettings } from "./helpers/fixMissingModuleSettings";
import { normalizeMetaObject } from "./helpers/normalizeMetaObject";
import { getEnabledModulesFromEnv } from "@/core/utils/envHelpers";

import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import tenants from "@/core/middleware/tenant/tenants.json";
import type { SupportedLocale } from "@/types/common";

const lang: SupportedLocale = getLogLocale();

/**
 * Meta dosyalarını tenant bazlı üretir/günceller.
 * @param tenantName opsiyonel olarak sadece bir tenant çalıştırmak için kullanılabilir.
 */
export async function generateMeta(tenantName?: string) {
  // Tenant listesi (tek tenant mı, tüm tenantlar mı?)
  const tenantsList = tenantName
    ? [tenantName]
    : Object.values(tenants).map((t) => t.toString());

  for (const TENANT of tenantsList) {
    try {
      logger.info(t("meta.start", lang, translations, { tenant: TENANT }), {
        tenant: TENANT,
        module: "meta",
        event: "meta.start",
        status: "init",
      });

      // 1. Tenant DB bağlantısı ve modelleri çek
      const conn = await getTenantDbConnection(TENANT);
      const { ModuleMeta, ModuleSetting } = getTenantModelsFromConnection(conn);

      // 2. Dosya dizinlerini hazırla
      const modulesPath = path.resolve(process.cwd(), "src/modules");
      const metaProjectDir = path.resolve(
        process.cwd(),
        `src/meta-configs/${TENANT}`
      );
      if (!fs.existsSync(metaProjectDir))
        fs.mkdirSync(metaProjectDir, { recursive: true });

      // 3. Dosya, modül ve var olan meta dosyalarını bul
      const allModules = fs
        .readdirSync(modulesPath)
        .filter((mod) =>
          fs.statSync(path.join(modulesPath, mod)).isDirectory()
        );
      const existingMetaFiles = fs
        .readdirSync(metaProjectDir)
        .filter((f) => f.endsWith(".meta.json"));
      const modulesInFs = new Set(allModules);

      // 4. Yetim (orphan) meta dosyalarını ve DB kayıtlarını temizle
      for (const file of existingMetaFiles) {
        const modName = file.replace(".meta.json", "");
        if (!modulesInFs.has(modName)) {
          logger.warn(
            t("meta.orphan.found", lang, translations, { mod: modName }),
            {
              tenant: TENANT,
              module: "meta",
              event: "meta.orphan.found",
              status: "orphan",
              mod: modName,
            }
          );
          try {
            fs.unlinkSync(path.join(metaProjectDir, file));
            logger.info(
              t("meta.orphan.deleted", lang, translations, { file }),
              {
                tenant: TENANT,
                module: "meta",
                event: "meta.orphan.delete",
                status: "success",
                file,
              }
            );
          } catch (err) {
            logger.error(
              t("meta.orphan.deleteFail", lang, translations, {
                mod: modName,
              }) +
                " " +
                String(err),
              {
                tenant: TENANT,
                module: "meta",
                event: "meta.orphan.deleteFail",
                status: "fail",
                mod: modName,
                error: err,
              }
            );
          }
          try {
            await ModuleMeta.deleteOne({ name: modName, tenant: TENANT });
            await ModuleSetting.deleteMany({ module: modName, tenant: TENANT });
            logger.info(
              t("meta.db.deleted", lang, translations, { mod: modName }),
              {
                tenant: TENANT,
                module: "meta",
                event: "meta.db.deleted",
                status: "success",
                mod: modName,
              }
            );
          } catch (err) {
            logger.error(
              t("meta.db.deleteFail", lang, translations, { mod: modName }) +
                " " +
                String(err),
              {
                tenant: TENANT,
                module: "meta",
                event: "meta.db.deleteFail",
                status: "fail",
                mod: modName,
                error: err,
              }
            );
          }
        }
      }

      // 5. Her modül için meta dosyası üret/güncelle
      for (const mod of allModules) {
        if (metaConfig.ignoreModules.includes(mod)) {
          logger.warn(t("meta.ignoreModule", lang, translations, { mod }), {
            tenant: TENANT,
            module: "meta",
            event: "meta.ignoreModule",
            status: "ignored",
            mod,
          });
          continue;
        }

        const modPath = path.join(modulesPath, mod);
        const routeFiles = getAllRouteFiles(modPath, TENANT);
        if (routeFiles.length === 0) {
          logger.warn(t("meta.noRoutes", lang, translations, { mod }), {
            tenant: TENANT,
            module: "meta",
            event: "meta.noRoutes",
            status: "warning",
            mod,
          });
          continue;
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
              String(err),
            {
              tenant: TENANT,
              module: "meta",
              event: "meta.file.parseFail",
              status: "fail",
              metaPath,
              error: err,
            }
          );
          existing = {};
        }

        const routes = routeFiles.flatMap((routeFile) => {
          const fileRoutes = extractRoutesFromFile(routeFile, TENANT);
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

        // Validation body schema ekle
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
                }),
                {
                  tenant: TENANT,
                  module: "meta",
                  event: "meta.attachValidationFail",
                  status: "warning",
                  mod,
                  error: err,
                }
              );
            }
          }
        }

        const rawMeta = {
          name: mod,
          ...existing,
          routes,
        };
        const normalizedMeta = normalizeMetaObject(rawMeta, TENANT);

        // Versiyon notu oluştur
        const note = t("meta.version.bumped", lang, translations, {
          mod,
          tenant: TENANT,
        });
        // Meta dosyasını güncelle ve version logla (tüm argümanları ver!)
        const finalMeta = updateMetaVersionLog(
          normalizedMeta,
          note,
          TENANT,
          t,
          lang
        );

        // Dosyaya yaz
        try {
          fs.writeFileSync(
            metaPath,
            JSON.stringify(finalMeta, null, 2),
            "utf8"
          );
        } catch (err) {
          logger.error(
            t("meta.meta.writeFail", lang, translations, { mod }) +
              " " +
              String(err),
            {
              tenant: TENANT,
              module: "meta",
              event: "meta.meta.writeFail",
              status: "fail",
              mod,
              error: err,
            }
          );
          continue;
        }

        // --- DB update, mutlaka tenant filter! ---
        try {
          await ModuleMeta.updateOne(
            { name: mod, tenant: TENANT },
            { $set: { ...finalMeta, tenant: TENANT } },
            { upsert: true }
          );
        } catch (err) {
          logger.error(
            t("meta.db.updateFail", lang, translations, { mod }) +
              " " +
              String(err),
            {
              tenant: TENANT,
              module: "meta",
              event: "meta.db.updateFail",
              status: "fail",
              mod,
              error: err,
            }
          );
        }

        if (routes.length > 0) {
          logger.info(
            t("meta.success", lang, translations, {
              mod,
              count: routes.length,
            }),
            {
              tenant: TENANT,
              module: "meta",
              event: "meta.success",
              status: "success",
              mod,
              count: routes.length,
            }
          );
        }
      }

      // --- ENV üzerinden aktif modüller ve temizlik ---
      const enabledModules = getEnabledModulesFromEnv(TENANT); // <--- Önemli!
      await enforceEnabledModulesFromEnv(); // Tüm tenantlar için çalışıyorsa parametresiz; yoksa parametreli!
      await cleanupDisabledModules(TENANT, enabledModules);
      await fixMissingModuleSettings(TENANT);

      logger.info(t("meta.finished", lang, translations, { tenant: TENANT }), {
        tenant: TENANT,
        module: "meta",
        event: "meta.finished",
        status: "success",
      });
    } catch (err) {
      logger.error(
        t("meta.meta.writeFail", lang, translations, {
          mod: "global",
          tenant: TENANT,
        }) +
          " " +
          String(err),
        {
          tenant: TENANT,
          module: "meta",
          event: "meta.meta.writeFail",
          status: "fail",
          error: err,
        }
      );
    } finally {
      if (tenantName) {
        mongoose.connection.close();
      }
    }
  }
}

export default generateMeta;
