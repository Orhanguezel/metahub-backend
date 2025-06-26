import "@/core/config/envLoader";
import mongoose from "mongoose";
import { ModuleMeta, ModuleSetting } from "@/modules/modules/admin.models";

// --- Sadece settings şemasındaki alanları toplayan yardımcı fonksiyon
function getSettingFieldsFromMeta(mod: any, tenantSlug: string) {
  return {
    module: mod.name,
    tenant: tenantSlug,
    enabled: typeof mod.enabled === "boolean" ? mod.enabled : true,
    visibleInSidebar:
      typeof mod.visibleInSidebar === "boolean" ? mod.visibleInSidebar : true,
    useAnalytics:
      typeof mod.useAnalytics === "boolean" ? mod.useAnalytics : false,
    showInDashboard:
      typeof mod.showInDashboard === "boolean" ? mod.showInDashboard : true,
    roles:
      Array.isArray(mod.roles) && mod.roles.length > 0 ? mod.roles : ["admin"],
    // NOT: createdAt, updatedAt mongoose tarafından otomatik atanır!
  };
}

async function seedSettingsForNewTenant(tenantSlug: string) {
  // 1. Tüm aktif modül meta kayıtlarını çek
  const allModules = await ModuleMeta.find({ enabled: true });
  let count = 0;

  for (const mod of allModules) {
    // 2. Mevcut setting var mı kontrol et
    const exists = await ModuleSetting.findOne({
      module: mod.name,
      tenant: tenantSlug,
    });
    if (!exists) {
      // 3. Sadece settings şemasındaki alanları kullan!
      const doc = getSettingFieldsFromMeta(mod, tenantSlug);
      await ModuleSetting.create(doc);
      count++;
      console.log(
        `[SYNC] ${mod.name} modülüne setting açıldı -> ${tenantSlug}`
      );
    }
  }
  console.log(`[RESULT] ${count} setting açıldı`);
}

// -- Kullanım: NODE_ENV=production bun run ts-node scripts/sync/seedSettingsForNewTenant.ts metahub
const tenantSlug = process.argv[2];
if (!tenantSlug) {
  console.error("Kullanım: node seedSettingsForNewTenant.js <tenantSlug>");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => seedSettingsForNewTenant(tenantSlug))
  .catch((err) => {
    console.error("MongoDB bağlantı hatası:", err);
    process.exit(2);
  });

export { seedSettingsForNewTenant };
