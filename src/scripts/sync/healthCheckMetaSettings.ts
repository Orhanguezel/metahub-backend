import "@/core/config/envLoader";
import mongoose from "mongoose";
import { ModuleMeta, ModuleSetting } from "@/modules/modules/admin.models";
import { Tenants } from "@/modules/tenants/tenants.model";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/modules/modules/i18n";

/**
 * Tüm aktif tenant + meta için eksik setting kaydını bulur ve sadece setting alanlarıyla tamamlar.
 * Sadece IModuleSetting modeline uygun alanlar eklenir!
 */
export async function healthCheckMetaSettings() {
  const locale = "en"; // veya "tr"
  let tenants: string[] = [];
  let modules: any[] = [];
  let repaired: { tenant: string; module: string }[] = [];
  let errorCount = 0;

  // --- Aktif tenant ve modül meta listesini çek ---
  try {
    tenants = (await Tenants.find({ isActive: true })).map((t) => t.slug);
    modules = await ModuleMeta.find({});
  } catch (err) {
    logger.error(`[healthCheck] Tenant/modül listesi alınamadı: ${err.message}`, {
      module: "healthCheckMetaSettings",
      event: "db.read_error",
      status: "fail",
    });
    throw err;
  }

  // --- Eksik setting'leri tamamla ---
  for (const tenant of tenants) {
    for (const mod of modules) {
      try {
        const exists = await ModuleSetting.findOne({ module: mod.name, tenant });
        if (!exists) {
          await ModuleSetting.create({
            module: mod.name,
            tenant,
            enabled: mod.enabled,
            visibleInSidebar: true,
            useAnalytics: false,
            showInDashboard: true,
            roles:
              Array.isArray(mod.roles) && mod.roles.length > 0
                ? mod.roles
                : ["admin"],
            order: typeof mod.order === "number" ? mod.order : 0,
          });
          repaired.push({ tenant, module: mod.name });
          logger.info(
            t("sync.settingRepaired", locale, translations, {
              moduleName: mod.name,
              tenant,
            }),
            {
              module: "healthCheckMetaSettings",
              event: "setting.repaired",
              status: "success",
              tenant,
              moduleName: mod.name, // burada da "module" yerine "moduleName"
            }
          );
          console.log(`[REPAIRED] ${tenant} için ${mod.name} setting eklendi`);
        }
      } catch (err) {
        errorCount++;
        logger.error(
          `[healthCheck] Setting eklenemedi: ${tenant} - ${mod.name} (${err.message})`,
          {
            module: "healthCheckMetaSettings",
            event: "setting.create_error",
            status: "fail",
            tenant,
            moduleName: mod.name, // <-- ÇAKIŞMA YOK!
          }
        );
        console.error(`[REPAIRED][ERROR] ${tenant} için ${mod.name}:`, err);
      }
    }
  }

  // --- Sonuç ve özet log ---
  if (!repaired.length && errorCount === 0) {
    logger.info(t("sync.settingsOk", locale, translations), {
      module: "healthCheckMetaSettings",
      event: "settings.ok",
      status: "info",
    });
    console.log("Tüm meta ve settings tam, eksik yok!");
  } else {
    logger.info(
      t("sync.missingSettings", locale, translations, {
        count: repaired.length,
      }),
      {
        module: "healthCheckMetaSettings",
        event: "settings.repaired",
        status: errorCount > 0 ? "warning" : "success",
        repairedCount: repaired.length,
        errorCount,
      }
    );
    if (repaired.length) {
      console.log("Eksik eklenenler:", repaired);
    }
    if (errorCount > 0) {
      console.log(`[REPAIRED][WARN] Toplam ${errorCount} tenant/modül kaydı eklenemedi!`);
    }
  }
}

// --- CLI desteği: direkt çalıştırıldığında env ve bağlantı adımı da kontrol altında ---
if (require.main === module) {
  (async () => {
    let uri = process.env.MONGO_URI;
    if (!uri) {
      console.error("❌ HATA: MONGO_URI environment variable is not set!");
      process.exit(1);
    }
    try {
      logger.info("[healthCheck] MongoDB bağlantısı başlatılıyor...", {
        module: "healthCheckMetaSettings",
      });
      await mongoose.connect(uri);
      logger.info("[healthCheck] MongoDB bağlantısı başarılı.", {
        module: "healthCheckMetaSettings",
      });

      await healthCheckMetaSettings();

      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      logger.error("❌ [healthCheck] Hata oluştu:", {
        module: "healthCheckMetaSettings",
        error: (err as any)?.message || err,
      });
      console.error("❌ [healthCheck] Hata:", err);
      await mongoose.disconnect();
      process.exit(1);
    }
  })();
}
