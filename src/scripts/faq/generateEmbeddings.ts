import "@/core/config/envLoader";
import { Tenants } from "@/modules/tenants/tenants.model";
import { getTenantDbConnection } from "@/core/config/tenantDb";
import { getTenantModelsFromConnection } from "@/core/middleware/tenant/getTenantModelsFromConnection";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import OpenAI from "openai";
import logger from "@/core/middleware/logger/logger";

// ✅ OpenAI istemcisi
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const EMBEDDING_MODEL = "text-embedding-ada-002";

// ✅ Belirli bir dile göre input metni birleştirir
const buildInputText = (
  question: Record<SupportedLocale, string>,
  answer: Record<SupportedLocale, string>
): string[] => {
  return SUPPORTED_LOCALES.map((lang) => {
    const q = question?.[lang]?.trim() || "";
    const a = answer?.[lang]?.trim() || "";
    return `${q}\n${a}`.trim();
  }).filter(Boolean); // boş olanları at
};

async function main() {
  const tenants = await Tenants.find({ isActive: true }, { slug: 1 }).lean();
  if (!tenants.length) throw new Error("Hiç aktif tenant yok!");

  for (const tenant of tenants) {
    try {
      console.log(`\n🔧 [${tenant.slug}] Embedding işlemi başlatılıyor...`);

      const conn = await getTenantDbConnection(tenant.slug);
      const { FAQ } = getTenantModelsFromConnection(conn);

      const faqs = await FAQ.find({
        $or: [{ embedding: { $exists: false } }, { embedding: { $size: 0 } }],
      });

      if (!faqs.length) {
        console.log(`🟡 [${tenant.slug}] Zaten tüm FAQ'lar embedding içeriyor.`);
        continue;
      }

      for (const faq of faqs) {
        const inputs = buildInputText(faq.question, faq.answer);

        // Eğer input yoksa atla
        if (!inputs.length) {
          console.warn(`⚠️  [${tenant.slug}] FAQ boş: ${faq._id}`);
          continue;
        }

        const embeddingResponse = await openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: inputs.join("\n\n"),
        });

        const embedding = embeddingResponse.data[0]?.embedding;
        if (!embedding || !Array.isArray(embedding)) {
          console.warn(`⚠️  [${tenant.slug}] Embedding alınamadı: ${faq._id}`);
          continue;
        }

        faq.embedding = embedding;
        await faq.save();
        console.log(`✅ [${tenant.slug}] Embedding eklendi: ${faq._id}`);
      }

      console.log(`🎉 [${tenant.slug}] Embedding işlemi tamamlandı.`);
    } catch (err) {
      logger.error(`❌ [${tenant.slug}] Tenant embedding hatası: ${err}`);
    }
  }

  process.exit(0);
}

main();
