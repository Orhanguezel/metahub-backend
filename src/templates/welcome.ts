import { baseTemplate } from "./baseTemplate";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/templates/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";

interface WelcomeTemplateParams {
  name: string;
  brandName?: string;
  brandFullName?: string;
  brandTeamName?: string;
  brandWebsite?: string;
}

export const welcomeTemplate = ({
  name,
  brandName,
  brandFullName,
  brandTeamName,
  brandWebsite,
}: WelcomeTemplateParams): string => {
  const locale: SupportedLocale = (getLogLocale() as SupportedLocale) || "en";
  const tt = (key: string, params?: any) => t(key, locale, translations, params);

  const _brand = brandName ?? "MetaHub";
  const _fullName = brandFullName ?? _brand;
  const _team = brandTeamName ?? `${_brand} Team`;

  const content = `
    <h2>${tt("welcome.greeting", { name })}</h2>
    <p>${tt("welcome.message1", { brandFull: _fullName })}</p>
    <p>${tt("welcome.message2")}</p>
    <p>${tt("welcome.message3")}</p>
    <p>${tt("welcome.sign", { brandTeam: _team })}</p>
  `;

  logger.debug(`[EmailTemplate] Welcome generated for ${name} | locale: ${locale}`);

  return baseTemplate({
    content,
    title: tt("welcome.title", { brand: _brand }),
    locale,
    brandName: _brand,
    brandWebsite,
  });
};
