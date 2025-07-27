import "@/core/config/envLoader";
import { Tenants } from "@/modules/tenants/tenants.model";
import { getTenantDbConnection } from "@/core/config/tenantDb";
import { getTenantModelsFromConnection } from "@/core/middleware/tenant/getTenantModelsFromConnection";
import logger from "@/core/middleware/logger/logger";

function generateRandomVector(length = 1536): number[] {
  return Array.from({ length }, () => Math.random() * 2 - 1);
}

async function main() {
  try {
    // 1️⃣ Aktif tüm tenantları al
    const tenants = await Tenants.find({ isActive: true }, { slug: 1 }).lean();
    if (!tenants.length) throw new Error("Hiç aktif tenant yok!");

    for (const tenant of tenants) {
      try {
        // 2️⃣ Tenant için DB bağlantısını al
        const conn = await getTenantDbConnection(tenant.slug);
        const models = getTenantModelsFromConnection(conn);
        const { FAQ } = models;

        // 3️⃣ Embedding'i eksik olan kayıtları bul
        const faqs = await FAQ.find({
          $or: [{ embedding: { $exists: false } }, { embedding: { $size: 0 } }],
        });

        if (faqs.length === 0) {
          console.log(`🟡 [${tenant.slug}] Tüm FAQ'lar zaten embedding içeriyor.`);
          continue;
        }

        for (const faq of faqs) {
          faq.embedding = generateRandomVector();
          await faq.save();
          console.log(`✅ [${tenant.slug}] Embedding eklendi: ${faq._id}`);
        }

        console.log(`🎉 [${tenant.slug}] Dummy embedding işlemi tamamlandı (${faqs.length} adet).`);
      } catch (err) {
        logger.error(`❌ [${tenant.slug}] FAQ dummy embedding sırasında hata oluştu: ${err}`);
      }
    }
  } catch (error) {
    console.error("🚨 Global Hata:", error);
  } finally {
    process.exit(0);
  }
}

main();
