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
  const locale: SupportedLocale = (getLogLocale() as SupportedLocale) || "en";
  const tt = (key: string, params?: any) => t(key, locale, translations, params);

  logger.debug(
    `[EmailTemplate] Password reset generated for ${name} | locale: ${locale}`
  );

  const content = `
    <h2>${tt("reset.greeting", { name })}</h2>
    <p>${tt("reset.info")}</p>
    <p>${tt("reset.action")}</p>
    <p style="text-align: center; margin: 20px 0;">
      <a href="${resetLink}" style="padding: 12px 24px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 8px;">
        ${tt("reset.button")}
      </a>
    </p>
    <p>${tt("reset.footer")}</p>
    <p>${tt("reset.sign", { team: brandName })}</p>
    <p style="font-size:12px;color:#999;">${brandName}${senderEmail ? ` | ${senderEmail}` : ""}</p>
  `;

  return baseTemplate({
    content,
    title: tt("reset.title", { brand: brandName }),
    locale,
    brandName,
    brandWebsite,
  });
};
