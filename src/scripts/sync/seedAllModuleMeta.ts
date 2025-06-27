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
 * Kesinlikle sadece şu alanlar meta'da olur:
 * name, label, icon, roles, enabled, language, version, order, statsKey, history, routes, createdAt, updatedAt
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
  const modulesDir = path.resolve(process.cwd(), "src/modules");
  const modules = fs
    .readdirSync(modulesDir)
    .filter((f) => fs.statSync(path.join(modulesDir, f)).isDirectory());

  let count = 0;
  for (const moduleName of modules) {
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
  }
  logger.info(t("sync.metaSummary", "tr", translations, { count }), {
    module: "seedAllModuleMeta",
    event: "meta.summary",
    status: "info",
    count,
  });
  console.log(`[META] Toplam ${count} yeni meta kaydı eklendi.`);
}

export { seedAllModuleMeta };
