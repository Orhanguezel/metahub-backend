import { baseTemplate } from "@/templates/baseTemplate";
import logger from "@/core/middleware/logger/logger";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "../i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";

interface ContactReplyParams {
  name: string;
  subject: string;
  message: string;
  brandName: string;
  brandWebsite?: string;
  locale?: SupportedLocale;
}

// Güvenli HTML escape (XSS korunması için)
const escapeHTML = (str: string) =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export const ContactReplyTemplate = ({
  name,
  subject,
  message,
  brandName,
  brandWebsite,
  locale,
}: ContactReplyParams): string => {
  const lang: SupportedLocale = locale || (getLogLocale() as SupportedLocale) || "en";
  const tr = translations[lang] || translations["en"];
  const t = (key: string, params?: any) => translate(key, lang, tr, params);

  logger.debug(`[EmailTemplate] Contact reply generated | lang: ${lang}`);

  const content = `
    <h2>${t("contact.replyGreeting", { name: escapeHTML(name) })}</h2>
    <p>${t("contact.replyInfo", { brand: escapeHTML(brandName) })}</p>

    <table style="margin-top: 20px; border-collapse: collapse; border: 1px solid #ddd;">
      <tr>
        <td style="padding: 8px 12px; font-weight: bold;">${t("contact.subject")}:</td>
        <td style="padding: 8px 12px;">${escapeHTML(subject)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; font-weight: bold;">${t("contact.message")}:</td>
        <td style="padding: 8px 12px;">${escapeHTML(message)}</td>
      </tr>
    </table>

    <p style="margin-top: 30px;">${t("contact.sign", { brand: escapeHTML(brandName) })}</p>
  `;

  return baseTemplate({
    content,
    title: t("contact.replyTitle", { brand: brandName }),
    locale: lang,
    brandName,
    brandWebsite,
  });
};
