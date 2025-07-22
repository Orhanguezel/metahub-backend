import { baseTemplate } from "@/templates/baseTemplate";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "../i18n";
import type { SupportedLocale } from "@/types/common";

// Basit HTML escape fonksiyonu (isteğe bağlı, güvenlik için)
function escapeHTML(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface ContactReplyParams {
  name: string;
  subject: string;
  message: string;
  locale?: SupportedLocale;
  brandName: string;
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

  // Subject ve message HTML injection’a karşı encode ediliyor
  const content = `
    <h2>${t("contact.replyGreeting", { name: escapeHTML(name) })}</h2>
    <p>${t("contact.replyInfo", { brand: escapeHTML(brandName) })}</p>
    <table style="margin-top: 20px; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 12px;"><strong>${t("contact.subject")}:</strong></td>
        <td style="padding: 8px 12px;">${escapeHTML(subject)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px;"><strong>${t("contact.message")}:</strong></td>
        <td style="padding: 8px 12px;">${escapeHTML(message)}</td>
      </tr>
    </table>
    <p style="margin-top: 30px;">${t("contact.sign", { brand: escapeHTML(brandName) })}</p>
  `;

  return baseTemplate(content, t("contact.replyTitle", { brand: escapeHTML(brandName) }));
};
