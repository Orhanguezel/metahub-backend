// src/scripts/faq/upsertToPinecone.ts

import "@/core/config/envLoader"; // Ortam değişkenlerini yükler
import { Pinecone } from "@pinecone-database/pinecone";
import { getTenantDbConnection } from "@/core/config/tenantDb";
import { getTenantModelsFromConnection } from "@/core/middleware/tenant/getTenantModelsFromConnection";
import { Tenants } from "@/modules/tenants/tenants.model";
import { PINECONE_INDEX_NAME, DEFAULT_NAMESPACE, pinecone } from "@/scripts/faq/pinecone";

const index = pinecone.Index(PINECONE_INDEX_NAME);

async function main() {
  const tenants = await Tenants.find({ isActive: true }, { slug: 1 }).lean();

  if (!tenants.length) throw new Error("❌ Hiç aktif tenant bulunamadı!");

  for (const tenant of tenants) {
    const conn = await getTenantDbConnection(tenant.slug);
    const models = getTenantModelsFromConnection(conn);
    const FAQ = models.FAQ;

    const faqs = await FAQ.find({
      isActive: true,
      embedding: { $exists: true, $not: { $size: 0 } },
    });

    if (faqs.length === 0) {
      console.log(`⏭️ [${tenant.slug}] Uygun embedding verisi bulunamadı.`);
      continue;
    }

    const vectors = faqs.map((faq) => {
      const metadata: Record<string, any> = {
        tenant: tenant.slug,
        category: "faq",
      };

      // 🔄 Çok dilli soru/cevapları düzleştir (örnek: question_en, answer_de ...)
      for (const [lang, text] of Object.entries(faq.question || {})) {
        metadata[`question_${lang}`] = text;
      }
      for (const [lang, text] of Object.entries(faq.answer || {})) {
        metadata[`answer_${lang}`] = text;
      }

      return {
        id: faq._id.toString(),
        values: faq.embedding,
        metadata,
      };
    });

    console.log(`🚀 [${tenant.slug}] Pinecone’a yüklenecek: ${vectors.length} kayıt`);

    await index.namespace(tenant.slug || DEFAULT_NAMESPACE).upsert(vectors);

    console.log(`✅ [${tenant.slug}] Pinecone upsert işlemi tamamlandı.`);
  }
}

main()
  .then(() => console.log("🎉 Tüm tenant’lar için işlem tamamlandı."))
  .catch((err) => console.error("❌ Genel hata:", err));
