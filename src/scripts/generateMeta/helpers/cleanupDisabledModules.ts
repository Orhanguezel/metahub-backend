import fs from "fs";
import path from "path";
import { getTenantDbConnection } from "@/core/config/tenantDb";
import { getTenantModelsFromConnection } from "@/core/middleware/tenant/getTenantModelsFromConnection";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/scripts/generateMeta/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";

/**
 * Bir tenant için kullanılmayan (env'de ENABLED_MODULES dışında kalan) modülleri temizler.
 * @param tenant Tenant adı (zorunlu!)
 * @param enabledModules Bu tenant için aktif olması gereken modül listesi
 */
export const cleanupDisabledModules = async (
  tenant: string,
  enabledModules: string[]
) => {
  const lang: SupportedLocale = getLogLocale();

  // 1. Tenant'a özel connection ve modelleri al
  let conn, ModuleMeta, ModuleSetting;
  try {
    conn = await getTenantDbConnection(tenant);
    const models = getTenantModelsFromConnection(conn);
    ModuleMeta = models.ModuleMeta;
    ModuleSetting = models.ModuleSetting;
  } catch (err) {
    logger.error(
      t("meta.cleanup.connFail", lang, translations, { tenant }) +
        " " +
        String(err),
      {
        tenant,
        module: "meta",
        event: "meta.cleanup.connFail",
        status: "fail",
        error: err,
      }
    );
    return;
  }

  // DB'den mevcut modüller (artık tenant context ile!)
  const allModuleSettings = await ModuleSetting.find({ tenant });
  const currentModules = allModuleSettings.map((s: any) => s.module);

  // Env'de olmayanları bul
  const toDelete = currentModules.filter(
    (mod) => !enabledModules.includes(mod)
  );

  if (toDelete.length === 0) return;

  const metaProjectDir = path.join(process.cwd(), `src/meta-configs/${tenant}`);

  for (const mod of toDelete) {
    // 1. Veritabanı kayıtlarını sil ve logla
    const metaDel = await ModuleMeta.deleteOne({ name: mod, tenant });
    const settingDel = await ModuleSetting.deleteMany({
      module: mod,
      tenant,
    });

    if (
      (metaDel.deletedCount && metaDel.deletedCount > 0) ||
      (settingDel.deletedCount && settingDel.deletedCount > 0)
    ) {
      logger.warn(
        t("meta.cleanup.deleting", lang, translations, { mod, tenant }),
        {
          tenant,
          module: "meta",
          event: "meta.cleanup.deleting",
          status: "deleting",
          mod,
        }
      );
      logger.info(
        t("meta.cleanup.deletedDb", lang, translations, { mod, tenant }),
        {
          tenant,
          module: "meta",
          event: "meta.cleanup.deletedDb",
          status: "success",
          mod,
        }
      );
    }

    // 2. Dosya sil
    const metaPath = path.join(metaProjectDir, `${mod}.meta.json`);
    if (fs.existsSync(metaPath)) {
      fs.unlinkSync(metaPath);
      logger.info(
        t("meta.cleanup.deletedFile", lang, translations, { metaPath, tenant }),
        {
          tenant,
          module: "meta",
          event: "meta.cleanup.deletedFile",
          status: "success",
          metaPath,
        }
      );
    }
  }
};
