import { baseTemplate } from "./baseTemplate";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/templates/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";

export interface PasswordResetTemplateParams {
  name: string;
  resetLink: string;
  brandName: string;       // zorunlu: "Königs Massage" vs.
  brandWebsite?: string;   // opsiyonel: tenant domain'den alınır
  senderEmail?: string;    // opsiyonel: footer’a yazmak için
}

export const passwordResetTemplate = ({
  name,
  resetLink,
  brandName,
  brandWebsite,
  senderEmail,
}: PasswordResetTemplateParams): string => {
  const locale = getLogLocale();
  const tr = translations[locale] || translations["en"];

  logger.debug(
    `[EmailTemplate] Password reset generated for ${name} | locale: ${locale}`
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
    <p>${t("reset.sign", locale, tr, { team: brandName })}</p>
    <p style="font-size:12px;color:#999;">${brandName}${senderEmail ? ` | ${senderEmail}` : ""}</p>
  `;

  return baseTemplate({
    content,
    title: t("reset.title", locale, tr, { brand: brandName }),
    locale,
    brandName,
    brandWebsite,
  });
};
