import "@/core/config/envLoader";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/modules/modules/i18n";
import type { SupportedLocale } from "@/types/common";
import { getTenantDbConnection } from "@/core/config/tenantDb";
import { getTenantModelsFromConnection } from "@/core/middleware/tenant/getTenantModelsFromConnection";

/**
 * Bir tenant'ın kendi veritabanındaki tüm module settingleri siler.
 * Ayrıca fiziksel olarak olmayan (klasörü bulunmayan) orphan meta ve ona ait tüm settings'i kaldırır.
 */
export async function removeTenantSettingsAndUnusedMetas(
  tenantSlug: string,
  locale: SupportedLocale = "en"
) {
  // 1️⃣ Tenant'ın kendi DB connection'unu ve modellerini al
  const conn = await getTenantDbConnection(tenantSlug);
  const { ModuleMeta, ModuleSetting } = getTenantModelsFromConnection(conn);

  // 2️⃣ Tüm module settinglerini sil
  const deletedSettings = await ModuleSetting.deleteMany({});
  logger.info(
    t("sync.tenantSettingsDeleted", locale, translations, {
      tenant: tenantSlug,
      count: deletedSettings.deletedCount,
    }),
    {
      script: "removeTenantSettingsAndUnusedMetas",
      event: "settings.deleted",
      status: "success",
      tenant: tenantSlug,
      deletedCount: deletedSettings.deletedCount,
    }
  );
  console.log(
    `[CLEANUP] ${tenantSlug} tenantına ait ${deletedSettings.deletedCount} module setting silindi.`
  );

  // 3️⃣ Orphan meta ve bağlı settings temizliği (sadece fiziksel klasörü olmayanlar, tenant bazlı)
  const modulesDir = path.resolve(process.cwd(), "src/modules");
  const moduleFolders = fs.existsSync(modulesDir)
    ? fs
        .readdirSync(modulesDir)
        .filter((f) => fs.statSync(path.join(modulesDir, f)).isDirectory())
    : [];

  // SADECE BU TENANT’A AİT METALARI KONTROL ET
  const allMetas = await ModuleMeta.find({});
  let deletedMetaCount = 0;
  let deletedOrphanSettings = 0;

  for (const meta of allMetas) {
    if (!moduleFolders.includes(meta.name)) {
      // Sadece tenant'ın kendi DB'sindeki orphan meta ve settingleri sil!
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
          script: "removeTenantSettingsAndUnusedMetas",
          event: "orphan.meta.deleted",
          status: "success",
          module: meta.name,
          tenant: tenantSlug,
        }
      );
      console.log(
        `[CLEANUP] '${meta.name}' meta ve ${delSettings.deletedCount} ayarı silindi (klasör yok) [tenant: ${tenantSlug}].`
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
      script: "removeTenantSettingsAndUnusedMetas",
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
    console.error("Kullanım: ts-node removeTenantSettingsAndUnusedMetas.ts <tenantSlug>");
    process.exit(1);
  }

  (async () => {
    try {
      // 👇 master bağlantısı
      const uri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/metahub";
      const dbName = process.env.MONGO_DB || undefined;
      await mongoose.connect(uri, { dbName } as any);

      await removeTenantSettingsAndUnusedMetas(tenantSlug);

      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error("MongoDB bağlantı hatası veya script hatası:", err);
      try { await mongoose.disconnect(); } catch {}
      process.exit(2);
    }
  })();
}

