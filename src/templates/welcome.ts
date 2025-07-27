import { baseTemplate } from "./baseTemplate";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/templates/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";

interface WelcomeTemplateParams {
  name: string;
  brandName?: string;       // tenant'tan gelir
  brandFullName?: string;   // opsiyonel özel tanım
  brandTeamName?: string;   // opsiyonel özel tanım
  brandWebsite?: string;    // tenant domain
}

export const welcomeTemplate = ({
  name,
  brandName,
  brandFullName,
  brandTeamName,
  brandWebsite,
}: WelcomeTemplateParams): string => {
  const lang = getLogLocale();
  const tr = translations[lang] || translations["en"];

  // Fallback değerler (env yerine geçici default)
  const fallbackBrand = brandName ?? "MetaHub";
  const fallbackFull = brandFullName ?? fallbackBrand;
  const fallbackTeam = brandTeamName ?? `${fallbackBrand} Team`;

  const content = `
    <h2>${t("welcome.greeting", lang, tr, { name })}</h2>
    <p>${t("welcome.message1", lang, tr, { brandFull: fallbackFull })}</p>
    <p>${t("welcome.message2", lang, tr)}</p>
    <p>${t("welcome.message3", lang, tr)}</p>
    <p>${t("welcome.sign", lang, tr, { brandTeam: fallbackTeam })}</p>
  `;

  logger.debug(`[EmailTemplate] Welcome generated for ${name} | lang: ${lang}`);

  return baseTemplate({
    content,
    title: t("welcome.title", lang, tr, { brand: fallbackBrand }),
    locale: lang,
    brandName: fallbackBrand,
    brandWebsite: brandWebsite, // undefined olabilir, baseTemplate fallback’le halleder
  });
};
