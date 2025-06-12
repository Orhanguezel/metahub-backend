import { generateMeta as generateMetaInner } from "./generate";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/scripts/generateMeta/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";

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
