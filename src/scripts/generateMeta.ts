// src/generateMeta.ts
import { generateMeta as generateMetaInner } from "./generateMeta/generateMeta";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/scripts/generateMeta/i18n";
import tenants from "@/core/middleware/tenant/tenants.json";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";

// Standart log dili helper'ı
const getLogLocale = (): SupportedLocale => {
  const envLocale = process.env.LOG_LOCALE as SupportedLocale;
  return SUPPORTED_LOCALES.includes(envLocale) ? envLocale : "en";
};

const args = process.argv.slice(2);
const lang = getLogLocale();

async function main() {
  try {
    // --tenant=xxx veya ENV ile tenant belirtilmişse
    const tenantArg = args.find((a) => a.startsWith("--tenant="));
    const tenant = tenantArg
      ? tenantArg.replace("--tenant=", "").trim()
      : process.env.TENANT_NAME;

    if (args.includes("--all")) {
      logger.info(t("meta.start.all", lang, translations));
      // Tüm tenantlar için çalıştır
      for (const tenant of Object.values(tenants)) {
        await generateMetaInner(tenant as string);
      }
      logger.info(t("meta.finished.all", lang, translations));
    } else if (tenant) {
      logger.info(t("meta.start.tenant", lang, translations, { tenant }));
      await generateMetaInner(tenant);
      logger.info(t("meta.finished.tenant", lang, translations, { tenant }));
    } else {
      logger.error(t("meta.arg.missing", lang, translations));
      throw new Error(
        "Tenant belirtmelisin! --tenant=xyz veya TENANT_NAME env ile."
      );
    }
  } catch (err) {
    logger.error(
      t("meta.meta.writeFail", lang, translations, { mod: "global" }) +
        " " +
        String(err)
    );
    process.exit(1);
  }
}

// CLI'dan çalıştırıldığında main fonksiyonunu başlat
if (require.main === module) {
  main();
}

// Programatik kullanım (örn: import/export) için de fonksiyon export edilir.
export async function generateMeta(tenant?: string) {
  try {
    await generateMetaInner(tenant);
    logger.info(
      t("meta.finished", lang, translations, tenant ? { tenant } : undefined)
    );
  } catch (err) {
    logger.error(
      t("meta.meta.writeFail", lang, translations, { mod: "global" }) +
        " " +
        String(err)
    );
    process.exit(1);
  }
}
