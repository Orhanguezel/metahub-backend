import { baseTemplate } from "./baseTemplate";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/templates/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";

interface WelcomeTemplateParams {
  name: string;
}

const BRAND_NAME = process.env.BRAND_NAME || "metahub";
const BRAND_FULL_NAME = process.env.BRAND_FULL_NAME || `${BRAND_NAME}`;
const BRAND_TEAM_NAME = process.env.BRAND_TEAM_NAME || `${BRAND_NAME} Team`;

export const welcomeTemplate = ({ name }: WelcomeTemplateParams): string => {
  const lang = getLogLocale();
  const tr = translations[lang] || translations["en"];

  const content = `
    <h2>${t("welcome.greeting", lang, tr, { name })}</h2>
    <p>${t("welcome.message1", lang, tr, { brandFull: BRAND_FULL_NAME })}</p>
    <p>${t("welcome.message2", lang, tr)}</p>
    <p>${t("welcome.message3", lang, tr)}</p>
    <p>${t("welcome.sign", lang, tr, { brandTeam: BRAND_TEAM_NAME })}</p>
  `;

  logger.debug(`[EmailTemplate] Welcome generated for ${name} | lang: ${lang}`);

  return baseTemplate(
    content,
    t("welcome.title", lang, tr, { brand: BRAND_NAME })
  );
};
