import { baseTemplate } from "@/templates/baseTemplate";
import logger from "@/core/middleware/logger/logger";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "../i18n";
import type { SupportedLocale } from "@/types/common";

interface ContactReplyParams {
  name: string;
  subject: string;
  message: string;
  locale?: SupportedLocale;
  brandName: string; // Tenant brand name
}

export const ContactReplyTemplate = ({
  name,
  subject,
  message,
  locale,
  brandName,
}: ContactReplyParams): string => {
  const lang: SupportedLocale = locale || "en";
  const t = (key: string, params?: any) =>
    translate(key, lang, translations, params);

  const content = `
    <h2>${t("contact.replyGreeting", { name })}</h2>
    <p>${t("contact.replyInfo", { brand: brandName })}</p>
    <table style="margin-top: 20px; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 12px;"><strong>${t("contact.subject")}:</strong></td>
        <td style="padding: 8px 12px;">${subject}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px;"><strong>${t("contact.message")}:</strong></td>
        <td style="padding: 8px 12px;">${message}</td>
      </tr>
    </table>
    <p style="margin-top: 30px;">${t("contact.sign", { brand: brandName })}</p>
  `;

  logger.debug(
    `[EmailTemplate] Contact reply generated for ${name} | lang: ${lang}`
  );

  return baseTemplate(content, t("contact.replyTitle"));
};
