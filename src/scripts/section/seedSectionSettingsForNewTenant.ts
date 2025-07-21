import { SectionMeta } from "@/modules/section/section.models";
import { Tenants } from "@/modules/tenants/tenants.model";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { getTenantDbConnection } from "@/core/config/tenantDb";
import { getTenantModelsFromConnection } from "@/core/middleware/tenant/getTenantModelsFromConnection";

async function seedSectionSettingsForNewTenant() {
  // 1️⃣ Aktif tenantları bul
  const allTenants = await Tenants.find({ isActive: true }).lean();
  if (!allTenants.length) {
    console.error("❌ Hiç aktif tenant yok!");
    process.exit(1);
  }

  // 2️⃣ Tüm section meta’ları çek (global SectionMeta’dan)
  const sectionMetas = await SectionMeta.find();
  if (!sectionMetas.length) {
    console.warn("⚠️ Hiç SectionMeta yok. Önce SectionMeta seed etmelisiniz!");
    process.exit(1);
  }

  // 3️⃣ Her tenant için, tenant'a özel DB bağlantısı ve model ile ayar ata
  let created = 0, skipped = 0;
  for (const tenant of allTenants) {
    const conn = await getTenantDbConnection(tenant.slug);
    const { SectionSetting } = getTenantModelsFromConnection(conn);

    for (const meta of sectionMetas) {
      const exists = await SectionSetting.findOne({
        tenant: tenant.slug,
        sectionKey: meta.sectionKey,
      });
      if (exists) {
        skipped++;
        continue;
      }
      await SectionSetting.create({
        tenant: tenant.slug,
        sectionKey: meta.sectionKey,
        enabled: meta.defaultEnabled,
        order: meta.defaultOrder,
        variant: meta.variant,
        params: meta.params || {},
        roles: ["admin"],    // Gerekirse meta’dan veya sabit
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      created++;
    }
  }

  logger.info(
    t("sync.sectionSettingSeeded", "tr", translations, { created, skipped }),
    {
      module: "seedSectionSettingsForNewTenant",
      event: "sectionSetting.seeded",
      status: "success",
      created,
      skipped,
    }
  );
  console.log(
    `SectionSetting seed tamamlandı. Tüm tenantlar için | Eklenen: ${created} | Atlanan (zaten vardı): ${skipped}`
  );
}

export { seedSectionSettingsForNewTenant };
