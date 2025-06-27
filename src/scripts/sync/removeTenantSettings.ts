import "@/core/config/envLoader";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { ModuleMeta, ModuleSetting } from "@/modules/modules/admin.models";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/modules/modules/i18n";
import type { SupportedLocale } from "@/types/common";

/**
 * Bir tenant'a ait tüm module settinglerini siler.
 * Ayrıca fiziksel olarak olmayan (klasörü bulunmayan) orphan meta ve ona ait tüm settings'i kaldırır.
 * (Ekstra, redundant bir alan yoktur; sadece modelde tanımlı işlemler yapılır.)
 */
export async function removeTenantSettingsAndUnusedMetas(
  tenantSlug: string,
  locale: SupportedLocale = "en"
) {
  // 1. Tenant'ın tüm module settinglerini sil
  const deletedSettings = await ModuleSetting.deleteMany({
    tenant: tenantSlug,
  });
  logger.info(
    t("sync.tenantSettingsDeleted", locale, translations, {
      tenant: tenantSlug,
      count: deletedSettings.deletedCount,
    }),
    {
      module: "removeTenantSettingsAndUnusedMetas",
      event: "settings.deleted",
      status: "success",
      tenant: tenantSlug,
    }
  );
  console.log(
    `[CLEANUP] ${tenantSlug} tenantına ait ${deletedSettings.deletedCount} module setting silindi.`
  );

  // 2. Orphan meta ve bağlı settings temizliği (yalnızca fiziksel klasörü olmayanlar)
  const modulesDir = path.resolve(process.cwd(), "src/modules");
  const moduleFolders = fs.existsSync(modulesDir)
    ? fs
        .readdirSync(modulesDir)
        .filter((f) => fs.statSync(path.join(modulesDir, f)).isDirectory())
    : [];

  const allMetas = await ModuleMeta.find();
  let deletedMetaCount = 0;
  let deletedOrphanSettings = 0;

  for (const meta of allMetas) {
    // Sadece fiziksel klasörü olmayanlar silinir!
    if (!moduleFolders.includes(meta.name)) {
      const delSettings = await ModuleSetting.deleteMany({ module: meta.name });
      await ModuleMeta.deleteOne({ name: meta.name });
      deletedMetaCount++;
      deletedOrphanSettings += delSettings.deletedCount || 0;
      logger.info(
        t("sync.orphanMetaDeleted", locale, translations, {
          moduleName: meta.name,
          count: delSettings.deletedCount,
        }),
        {
          module: "removeTenantSettingsAndUnusedMetas",
          event: "orphan.meta.deleted",
          status: "success",
          meta: meta.name,
        }
      );
      console.log(
        `[CLEANUP] '${meta.name}' meta ve ${delSettings.deletedCount} ayarı silindi (klasör yok).`
      );
    }
  }

  logger.info(
    t("sync.cleanupSummary", locale, translations, {
      tenant: tenantSlug,
      deletedSettings: deletedSettings.deletedCount,
      deletedMetas: deletedMetaCount,
      deletedOrphanSettings,
    }),
    {
      module: "removeTenantSettingsAndUnusedMetas",
      event: "cleanup.summary",
      status: "info",
      tenant: tenantSlug,
      deletedSettings: deletedSettings.deletedCount,
      deletedMetas: deletedMetaCount,
      deletedOrphanSettings,
    }
  );

  console.log(
    `[RESULT] ${deletedSettings.deletedCount} setting '${tenantSlug}' için silindi. ${deletedMetaCount} orphan meta ve ${deletedOrphanSettings} ayarı kaldırıldı.`
  );
}

// --- CLI ile çalışma desteği ---
if (require.main === module) {
  const tenantSlug = process.argv[2];
  if (!tenantSlug) {
    console.error(
      "Kullanım: bun x ts-node .../removeTenantSettingsAndUnusedMetas.ts <tenantSlug>"
    );
    process.exit(1);
  }

  (async () => {
    try {
      const uri = process.env.MONGO_URI;
      if (!uri) throw new Error("MONGO_URI environment variable is not set!");
      await mongoose.connect(uri);
      await removeTenantSettingsAndUnusedMetas(tenantSlug);
      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error("MongoDB bağlantı hatası veya script hatası:", err);
      process.exit(2);
    }
  })();
}
