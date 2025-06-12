import { generateMeta as generateMetaInner } from "./generateMeta/generate";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/scripts/generateMeta/i18n";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";

// Standart log dili helper'ı
const getLogLocale = (): SupportedLocale => {
  const envLocale = process.env.LOG_LOCALE as SupportedLocale;
  return SUPPORTED_LOCALES.includes(envLocale) ? envLocale : "en";
};

export async function generateMeta() {
  const lang = getLogLocale();

  try {
    await generateMetaInner();

    logger.info(t("meta.finished", lang, translations));
  } catch (err) {
    logger.error(
      t("meta.meta.writeFail", lang, translations, { mod: "global" }) +
        " " +
        String(err)
    );
    process.exit(1);
  }
}
