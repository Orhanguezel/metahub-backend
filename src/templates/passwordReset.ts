import { baseTemplate } from "./baseTemplate";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/templates/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";

interface PasswordResetTemplateParams {
  name: string;
  resetLink: string;
}

const BRAND_TEAM_NAME = process.env.BRAND_TEAM_NAME || "metahub Team";

export const passwordResetTemplate = ({
  name,
  resetLink,
}: PasswordResetTemplateParams): string => {
  const locale = getLogLocale(); // env'den veya default
  const tr = translations[locale] || translations["en"];

  logger.debug(
    `[EmailTemplate] Password reset for: ${name} | locale: ${locale}`
  );

  const content = `
    <h2>${t("reset.greeting", locale, tr, { name })}</h2>
    <p>${t("reset.info", locale, tr)}</p>
    <p>${t("reset.action", locale, tr)}</p>
    <p style="text-align: center; margin: 20px 0;">
      <a href="${resetLink}" style="padding: 12px 24px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 8px;">
        ${t("reset.button", locale, tr)}
      </a>
    </p>
    <p>${t("reset.footer", locale, tr)}</p>
    <p>${t("reset.sign", locale, tr, { team: BRAND_TEAM_NAME })}</p>
  `;

  return baseTemplate(content, t("reset.title", locale, tr));
};
