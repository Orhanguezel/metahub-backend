import "@/core/config/envLoader";
import { Tenants } from "@/modules/tenants/tenants.model";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "./i18n";

// Multi-tenant db helpers:
import { getTenantDbConnection } from "@/core/config/tenantDb";
import { getTenantModelsFromConnection } from "@/core/middleware/tenant/getTenantModelsFromConnection";
import sectionMetaSeedRaw from "./sectionMetaSeed.json";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { SupportedLocale } from "@/types/common";

// --- Seed datasını doldur
const sectionMetaSeed = sectionMetaSeedRaw.map((s) => ({
  ...s,
  label: fillAllLocales(s.label),
  description: fillAllLocales(s.description),
  required: "required" in s ? s.required : false,
  params: "params" in s ? s.params : {},
  defaultEnabled: "defaultEnabled" in s ? s.defaultEnabled : true,
  defaultOrder: "defaultOrder" in s ? s.defaultOrder : 9999,
}));

async function seedAllSectionMeta() {
  // 1️⃣ Tüm tenantları al
  const tenants = await Tenants.find({ isActive: true }, { slug: 1 }).lean();
  if (!tenants.length) throw new Error("Hiç tenant yok!");

  let created = 0, updated = 0, total = 0;

  for (const tenant of tenants) {
    // 2️⃣ Tenant'ın kendi db connection'ını al
    const conn = await getTenantDbConnection(tenant.slug);
    const { SectionMeta } = getTenantModelsFromConnection(conn);

    for (const section of sectionMetaSeed) {
      const sectionKey = String(section.sectionKey ?? "");
      if (!sectionKey) continue;

      // tenant+sectionKey unique olacak şekilde kontrol
      const existing = await SectionMeta.findOne({ tenant: tenant.slug, sectionKey: sectionKey });
      const locale: SupportedLocale = "tr";

      if (existing) {
        await SectionMeta.updateOne(
          { tenant: tenant.slug, sectionKey: sectionKey },
          { $set: { ...section, tenant: tenant.slug, sectionKey: sectionKey } }
        );
        logger.info(
          t("sync.sectionMetaUpdated", locale, translations, { sectionKey: sectionKey, tenant: tenant.slug }),
          { module: "seedAllSectionMeta", event: "sectionMeta.updated", status: "success", sectionKey: sectionKey, tenant: tenant.slug }
        );
        updated++;
      } else {
        await SectionMeta.create({ ...section, tenant: tenant.slug, sectionKey: sectionKey });
        logger.info(
          t("sync.sectionMetaCreated", locale, translations, { sectionKey: sectionKey, tenant: tenant.slug }),
          { module: "seedAllSectionMeta", event: "sectionMeta.created", status: "success", sectionKey: sectionKey, tenant: tenant.slug }
        );
        created++;
      }
      total++;
    }
  }

  logger.info(
    t("sync.sectionMetaSummary", "tr", translations, { created, updated, total }),
    {
      module: "seedAllSectionMeta",
      event: "sectionMeta.summary",
      created,
      updated,
      total,
    }
  );
}

export { seedAllSectionMeta };
