import { getTenantModelsFromConnection } from "@/core/middleware/tenant/getTenantModelsFromConnection";
import { getTenantDbConnection } from "@/core/config/tenantDb";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/scripts/generateMeta/i18n";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import type { IModuleMeta } from "@/modules/modules/types";

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
  const conn = await getTenantDbConnection(tenant);
  const { ModuleMeta, ModuleSetting } = getTenantModelsFromConnection(conn);

  // Lean sonucunu unknown array olarak tipliyoruz
  const allMeta = (await ModuleMeta.find({}).lean()) as unknown[];

  let fixedCount = 0;

  for (const metaRaw of allMeta) {
    // HER satırda force cast yap!
    const meta = metaRaw as IModuleMeta;

    const existing = await ModuleSetting.findOne({
      tenant,
      module: meta.name,
    });

    if (!existing) {
      const newSetting = {
        tenant,
        module: meta.name,
        enabled: meta.enabled ?? true,
        visibleInSidebar: (meta as any).visibleInSidebar ?? true, // <-- as any ile garanti
        useAnalytics: (meta as any).useAnalytics ?? false, // <-- as any ile garanti
        showInDashboard: (meta as any).showInDashboard ?? true, // <-- as any ile garanti
        roles: Array.isArray(meta.roles) ? meta.roles : ["admin"],
        // createdAt, updatedAt mongoose otomatik
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
