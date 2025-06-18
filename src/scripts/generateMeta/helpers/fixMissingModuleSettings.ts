// src/scripts/generateMeta/utils/fixMissingModuleSettings.ts

import { getTenantModelsFromConnection } from "@/core/middleware/tenant/getTenantModelsFromConnection";
import { getTenantDbConnection } from "@/core/config/tenantDb";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/scripts/generateMeta/i18n";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";

/**
 * Tüm tenantlar için veya belirli bir tenant için eksik module setting oluşturur.
 * Her çağrıda tenant ve locale zorunludur!
 */
const getDefaultLabel = (name: string) =>
  SUPPORTED_LOCALES.reduce(
    (acc, l) => ({
      ...acc,
      [l]: name.charAt(0).toUpperCase() + name.slice(1),
    }),
    {} as Record<SupportedLocale, string>
  );

export const fixMissingModuleSettings = async (
  tenant: string,
  locale: SupportedLocale = "en"
) => {
  // 1. Sadece o tenant'ın meta'larını çek
  const conn = await getTenantDbConnection(tenant);
  const { ModuleMeta, ModuleSetting } = getTenantModelsFromConnection(conn);
  const allMeta = await ModuleMeta.find({ tenant });
  let fixedCount = 0;
  for (const meta of allMeta) {
    const existing = await ModuleSetting.findOne({
      tenant,
      module: meta.name,
    });

    if (!existing) {
      // Eksikse otomatik oluştur
      const newSetting = {
        tenant,
        module: meta.name,
        enabled: meta.enabled ?? true,
        visibleInSidebar: meta.visibleInSidebar ?? true,
        useAnalytics: meta.useAnalytics ?? false,
        roles: meta.roles ?? ["admin"],
        icon: meta.icon ?? "box",
        label:
          typeof meta.label === "object"
            ? meta.label
            : getDefaultLabel(meta.name),
        language: meta.language ?? locale,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await ModuleSetting.create(newSetting);
      fixedCount++;
      logger.info(
        t("meta.fix.setting.created", locale, translations, {
          module: meta.name,
          tenant,
        }),
        {
          tenant,
          module: "meta",
          event: "meta.fix.setting.created",
          status: "success",
          moduleName: meta.name,
        }
      );
    }
  }
  if (fixedCount) {
    logger.info(
      t("meta.fix.setting.completed", locale, translations, {
        count: fixedCount,
        tenant,
      }),
      {
        tenant,
        module: "meta",
        event: "meta.fix.setting.completed",
        status: "success",
        count: fixedCount,
      }
    );
    console.log(
      `[Meta] ${fixedCount} eksik setting "${tenant}" için otomatik eklendi.`
    );
  } else {
    logger.info(
      t("meta.fix.setting.noMissing", locale, translations, { tenant }),
      {
        tenant,
        module: "meta",
        event: "meta.fix.setting.noMissing",
        status: "success",
      }
    );
    console.log(
      `[Meta] "${tenant}" için eksik setting bulunamadı, tüm modüller tamam.`
    );
  }
};
