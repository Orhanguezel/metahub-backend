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
  const locale = "en"; // Gerekiyorsa "tr" ile değiştir veya parametreye çek.
  const tenants = (await Tenants.find({ isActive: true })).map((t) => t.slug);
  const modules = await ModuleMeta.find({});

  let repaired: { tenant: string; module: string }[] = [];

  for (const tenant of tenants) {
    for (const mod of modules) {
      const exists = await ModuleSetting.findOne({ module: mod.name, tenant });
      if (!exists) {
        // Sadece override (setting) alanları eklenir!
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
            moduleName: mod.name,
          }
        );
        console.log(`[REPAIRED] ${tenant} için ${mod.name} setting tamamlandı`);
      }
    }
  }

  if (!repaired.length) {
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
        status: "warning",
        repairedCount: repaired.length,
      }
    );
    console.log("Eksikler (eklenenler):", repaired);
  }
}

// CLI ile çalıştırma desteği:
if (require.main === module) {
  (async () => {
    try {
      const uri = process.env.MONGO_URI;
      if (!uri) throw new Error("MONGO_URI environment variable is not set!");
      await mongoose.connect(uri);
      await healthCheckMetaSettings();
      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error("❌ Hata:", err);
      process.exit(1);
    }
  })();
}
