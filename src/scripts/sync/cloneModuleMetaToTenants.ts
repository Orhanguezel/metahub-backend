import "@/core/config/envLoader";
import mongoose from "mongoose";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/modules/modules/i18n";
import { Tenants } from "@/modules/tenants/tenants.model";
import { getTenantDbConnection } from "@/core/config/tenantDb";
import { getTenantModelsFromConnection } from "@/core/middleware/tenant/getTenantModelsFromConnection";

// --- Config ---
const SOURCE_TENANT = "metahub";

async function cloneModuleMetaForAllTenants() {
  // 1️⃣ Tüm aktif tenantları bul
  const tenants = await Tenants.find({ isActive: true }, { slug: 1 }).lean();
  if (!tenants.length) throw new Error("Hiç tenant yok!");

  // 2️⃣ Kaynak (merkezi) tenantın meta'larını oku
  const srcConn = await getTenantDbConnection(SOURCE_TENANT);
  const { ModuleMeta: SrcModuleMeta } = getTenantModelsFromConnection(srcConn);
  const allMetas = await SrcModuleMeta.find({ tenant: SOURCE_TENANT }).lean();

  let insertCount = 0, skipCount = 0, total = 0;

  for (const tenantObj of tenants) {
    const tenant = tenantObj.slug;
    if (tenant === SOURCE_TENANT) continue; // Merkezi tenantı atla

    // 3️⃣ Hedef tenant DB bağlantısı ve modeli
    const targetConn = await getTenantDbConnection(tenant);
    const { ModuleMeta: TargetModuleMeta } = getTenantModelsFromConnection(targetConn);

    for (const meta of allMetas) {
      // Aynı tenant+name varsa atla
      const exists = await TargetModuleMeta.findOne({ tenant, name: meta.name });
      if (exists) {
        skipCount++;
        logger.info(`[SKIP] ${meta.name} zaten var: ${tenant}`, {
          module: "cloneModuleMetaForAllTenants", status: "skip", tenant, name: meta.name
        });
        continue;
      }
      // _id, __v gibi alanları asla kopyalama!
      const { _id, __v, ...copy } = meta;
      // HISTORY alanı varsa valid olanları filtrele
      const cleanHistory = Array.isArray(meta.history)
        ? meta.history.filter(h => h && h.version)
        : [];
      // Etiketleri, zaman damgalarını ve tenant'ı set et
      await TargetModuleMeta.create({
        ...copy,
        tenant, // Hedef tenant'ın adını yaz!
        createdAt: new Date(),
        updatedAt: new Date(),
        history: cleanHistory,
      });
      insertCount++;
      logger.info(`[INSERT] ${meta.name} eklendi: ${tenant}`, {
        module: "cloneModuleMetaForAllTenants", status: "insert", tenant, name: meta.name
      });
    }
    total++;
  }

  logger.info(`[DONE] Inserted: ${insertCount}, Skipped: ${skipCount}, Total tenants: ${total}`, {
    module: "cloneModuleMetaForAllTenants",
    status: "summary",
    insertCount,
    skipCount,
    total,
  });
  console.log(`[DONE] Inserted: ${insertCount}, Skipped: ${skipCount}, Tenants: ${total}`);
}

// --- CLI desteği (manuel çalıştırma için) ---
if (require.main === module) {
  (async () => {
    try {
      const uri = process.env.MONGO_URI;
      if (!uri) throw new Error("MONGO_URI environment variable is not set!");
      await mongoose.connect(uri); // Sadece ana bağlantı (opsiyonel, logging/stat için)
      await cloneModuleMetaForAllTenants();
      await mongoose.disconnect();
      process.exit(0);
    } catch (e) {
      console.error("Hata:", e);
      process.exit(1);
    }
  })();
}

export { cloneModuleMetaForAllTenants };
