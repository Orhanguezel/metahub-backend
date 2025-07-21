import { SectionMeta } from "@/modules/section/section.models";
import { Tenants } from "@/modules/tenants/tenants.model";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { getTenantDbConnection } from "@/core/config/tenantDb";
import { getTenantModelsFromConnection } from "@/core/middleware/tenant/getTenantModelsFromConnection";

const DEFAULT_LOCALE = "tr";

async function syncSectionSettingsWithMeta() {
  // 1️⃣ Aktif tenantlar
  const tenants = await Tenants.find({ isActive: true }, { slug: 1 }).lean();
  if (!tenants.length) {
    const msg = t("sync.noTenant", DEFAULT_LOCALE, translations);
    console.error(msg);
    process.exit(1);
  }

  // 2️⃣ SectionMeta'ları (global DB'den) çek
  const sectionMetas = await SectionMeta.find().lean();
  if (!sectionMetas.length) {
    const msg = t("sync.noSectionMeta", DEFAULT_LOCALE, translations);
    console.error(msg);
    process.exit(1);
  }

  let createdCount = 0, updatedCount = 0, skippedCount = 0;

  for (const tenant of tenants) {
    // Tenant'a özel DB ve model injection
    const conn = await getTenantDbConnection(tenant.slug);
    const { SectionSetting } = getTenantModelsFromConnection(conn);

    for (const meta of sectionMetas) {
      // SectionSetting sadece tenant'ın DB'sinde var mı?
      const setting = await SectionSetting.findOne({ tenant: tenant.slug, sectionKey: meta.sectionKey });

      if (!setting) {
        // YOKSA: tenant'a section meta'nın varsayılanlarıyla ekle
        await SectionSetting.create({
          tenant: tenant.slug,
          sectionKey: meta.sectionKey,
          enabled: meta.defaultEnabled,
          order: meta.defaultOrder,
          variant: meta.variant,
          roles: ["admin"],
          params: meta.params || {},
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        createdCount++;
        logger.info(
          t("sync.sectionSettingCreated", DEFAULT_LOCALE, translations, {
            tenant: tenant.slug,
            sectionKey: meta.sectionKey,
          }),
          {
            module: "syncSectionSettingsWithMeta",
            event: "sectionSetting.created",
            status: "success",
            tenant: tenant.slug,
            sectionKey: meta.sectionKey,
          }
        );
      } else {
        // VARSA: Eksik alanları meta'dan güncelle, tenant override'ları koru
        let needUpdate = false;
        if (setting.enabled === undefined) {
          setting.enabled = meta.defaultEnabled;
          needUpdate = true;
        }
        if (setting.order === undefined) {
          setting.order = meta.defaultOrder;
          needUpdate = true;
        }
        if (!setting.variant && meta.variant) {
          setting.variant = meta.variant;
          needUpdate = true;
        }
        if (!setting.roles || !setting.roles.length) {
          setting.roles = ["admin"];
          needUpdate = true;
        }
        if (setting.params == null && meta.params) {
          setting.params = meta.params;
          needUpdate = true;
        }
        if (needUpdate) {
          setting.updatedAt = new Date();
          await setting.save();
          updatedCount++;
          logger.info(
            t("sync.sectionSettingUpdated", DEFAULT_LOCALE, translations, {
              tenant: tenant.slug,
              sectionKey: meta.sectionKey,
            }),
            {
              module: "syncSectionSettingsWithMeta",
              event: "sectionSetting.updated",
              status: "success",
              tenant: tenant.slug,
              sectionKey: meta.sectionKey,
            }
          );
        } else {
          skippedCount++;
        }
      }
    }
  }

  // Summary (dil destekli)
  const summaryMsg = t("sync.sectionSettingSummary", DEFAULT_LOCALE, translations, {
    created: createdCount,
    updated: updatedCount,
    skipped: skippedCount,
    totalMeta: sectionMetas.length,
    totalTenant: tenants.length,
  });
  logger.info(summaryMsg, {
    module: "syncSectionSettingsWithMeta",
    event: "sectionSetting.syncSummary",
    status: "info",
    created: createdCount,
    updated: updatedCount,
    skipped: skippedCount,
    totalMeta: sectionMetas.length,
    totalTenant: tenants.length,
  });
  console.log(summaryMsg);
}

export { syncSectionSettingsWithMeta };
