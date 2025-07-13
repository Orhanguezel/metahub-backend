import fs from "fs";
import path from "path";
import { ModuleMeta } from "@/modules/modules/admin.models";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/modules/modules/i18n";

/**
 * SADECE meta alanlarını kullanarak, fiziksel olarak var olan
 * her modül için ModuleMeta kaydı oluşturur (varsa atlar).
 */
const DEFAULT_META = {
  icon: "box",
  enabled: true,
  roles: ["admin"],
  language: "en",
  version: "1.0.0",
  order: 0,
  routes: [],
  history: [],
  statsKey: "",
};

async function seedAllModuleMeta() {
  try {
    const modulesDir = path.resolve(process.cwd(), "src/modules");
    if (!fs.existsSync(modulesDir)) {
      throw new Error(`src/modules dizini bulunamadı: ${modulesDir}`);
    }

    // Klasörleri oku
    const allEntries = fs.readdirSync(modulesDir);
    const modules: string[] = [];
    for (const entry of allEntries) {
      const fullPath = path.join(modulesDir, entry);
      try {
        if (fs.statSync(fullPath).isDirectory()) {
          modules.push(entry);
        }
      } catch (err) {
        logger.warn(`[META] Klasör okunamadı: ${entry} (${err.message})`, {
          module: "seedAllModuleMeta",
          event: "fs.error",
          status: "warning",
        });
      }
    }

    if (modules.length === 0) {
      logger.warn(`[META] Hiç modül klasörü bulunamadı. Path: ${modulesDir}`, {
        module: "seedAllModuleMeta",
        event: "meta.no_modules",
        status: "warning",
      });
      console.log(`[META] Hiç modül klasörü bulunamadı!`);
      return;
    }

    let count = 0;
    for (const moduleName of modules) {
      try {
        const exists = await ModuleMeta.findOne({ name: moduleName });
        if (!exists) {
          const label = fillAllLocales(moduleName); // Tüm diller için label doldur
          await ModuleMeta.create({
            name: moduleName,
            label,
            ...DEFAULT_META,
          });
          count++;
          logger.info(t("sync.metaCreated", "tr", translations, { moduleName }), {
            module: "seedAllModuleMeta",
            event: "meta.created",
            status: "success",
          });
          console.log(`[META] ${moduleName} meta kaydı eklendi`);
        } else {
          logger.info(t("sync.metaExists", "tr", translations, { moduleName }), {
            module: "seedAllModuleMeta",
            event: "meta.exists",
            status: "info",
          });
        }
      } catch (err) {
        logger.error(`[META] Meta eklenemedi: ${moduleName} (${err.message})`, {
          module: "seedAllModuleMeta",
          event: "meta.create_error",
          status: "fail",
          moduleName,
        });
        console.error(`[META] Meta eklenemedi: ${moduleName}:`, err);
      }
    }
    logger.info(t("sync.metaSummary", "tr", translations, { count }), {
      module: "seedAllModuleMeta",
      event: "meta.summary",
      status: "info",
      count,
    });
    console.log(`[META] Toplam ${count} yeni meta kaydı eklendi.`);
  } catch (e: any) {
    logger.error(`[META] seedAllModuleMeta hata: ${e.message}`, {
      module: "seedAllModuleMeta",
      event: "meta.error",
      status: "fail",
    });
    console.error(`[META] seedAllModuleMeta hata:`, e);
    throw e; // Yukarıya fırlat ki script tamamen dursun
  }
}

export { seedAllModuleMeta };
