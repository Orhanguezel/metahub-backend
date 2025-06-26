// src/scripts/sync/healthCheckMetaSettings.ts
import "@/core/config/envLoader";
import mongoose from "mongoose";
import { ModuleMeta, ModuleSetting } from "@/modules/modules/admin.models";
import { Tenants } from "@/modules/tenants/tenants.model";

/**
 * healthCheckMetaSettings: Zaten bağlantı açılmışsa (import edildiğinde) yeni bağlantı açmaz.
 * CLI'dan standalone çalışınca kendi bağlantısını açar.
 */
export async function healthCheckMetaSettings() {
  const allTenants = (await Tenants.find({ isActive: true })).map(
    (t) => t.slug
  );
  const allModules = await ModuleMeta.find({});
  let missing = [];

  for (const tenant of allTenants) {
    for (const mod of allModules) {
      const exists = await ModuleSetting.findOne({ module: mod.name, tenant });
      if (!exists) {
        missing.push({ tenant, module: mod.name });
        await ModuleSetting.create({
          module: mod.name,
          tenant,
          enabled: mod.enabled,
          roles: mod.roles,
          icon: mod.icon,
          label: mod.label,
          language: mod.language,
        });
        console.log(`[REPAIRED] ${tenant} için ${mod.name} setting tamamlandı`);
      }
    }
  }
  if (!missing.length) {
    console.log("Tüm meta ve settings tam, eksik yok!");
  } else {
    console.log("Eksikler:", missing);
  }
}

// Eğer bu dosya doğrudan çalıştırılırsa (CLI, ts-node vs)
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
