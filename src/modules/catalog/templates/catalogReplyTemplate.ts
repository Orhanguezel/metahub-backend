import { baseTemplate } from "@/templates/baseTemplate";
import logger from "@/core/middleware/logger/logger";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "../i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";

// --- TİP ---
interface CatalogReplyParams {
  name: string;
  brandName: string;
  catalogFileUrl: string;         // PDF linki
  catalogFileName?: string;       // PDF dosya adı (opsiyonel)
  subject?: string;               // İletişim formu başlığı (isteğe bağlı)
  message?: string;               // Kullanıcı açıklaması (isteğe bağlı)
  brandWebsite?: string;
  locale?: SupportedLocale;
}

// Güvenli HTML escape (XSS korunması için)
const escapeHTML = (str: string = "") =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

// --- TEMPLATE ---
export const CatalogReplyTemplate = ({
  name,
  brandName,
  catalogFileUrl,
  catalogFileName,
  subject,
  message,
  brandWebsite,
  locale,
}: CatalogReplyParams): string => {
  const lang: SupportedLocale =
    locale || (getLogLocale() as SupportedLocale) || "en";
  const tr = translations[lang] || translations["en"];
  const t = (key: string, params?: any) => translate(key, lang, tr, params);

  logger.debug(`[EmailTemplate] Catalog reply generated | lang: ${lang}`);

  const content = `
    <h2>${t("catalog.replyGreeting", { name: escapeHTML(name) })}</h2>
    <p>${t("catalog.replyInfo", { brand: escapeHTML(brandName) })}</p>
    <div style="margin: 36px 0 32px 0; text-align: center;">
      <a href="${catalogFileUrl}" target="_blank"
         style="display: inline-block; background: #2184e7; color: #fff; padding: 15px 36px; font-size: 1.13em; font-weight: 600; border-radius: 8px; text-decoration: none; letter-spacing: 0.03em; box-shadow: 0 3px 16px #2184e766;">
        ${catalogFileName ? escapeHTML(catalogFileName) : t("catalog.downloadButton", { brand: brandName })}
      </a>
      <div style="margin-top:8px; color:#888; font-size:0.97em;">
        ${t("catalog.downloadInfo")}
      </div>
    </div>
    <table style="margin-top: 12px; border-collapse: collapse; border: 1px solid #ddd; width: 100%; max-width: 540px;">
      ${subject ? `
      <tr>
        <td style="padding: 8px 12px; font-weight: bold; background:#f6f6f6;">${t("catalog.subject")}:</td>
        <td style="padding: 8px 12px;">${escapeHTML(subject)}</td>
      </tr>
      ` : ""}
      ${message ? `
      <tr>
        <td style="padding: 8px 12px; font-weight: bold; background:#f6f6f6;">${t("catalog.message")}:</td>
        <td style="padding: 8px 12px;">${escapeHTML(message)}</td>
      </tr>
      ` : ""}
    </table>
    <p style="margin-top: 30px;">
      ${t("catalog.sign", { brand: escapeHTML(brandName) })}<br/>
      ${brandWebsite ? `<a href="${brandWebsite}" target="_blank" style="color:#2184e7; text-decoration:underline;">${brandWebsite}</a>` : ""}
    </p>
  `;

  return baseTemplate({
    content,
    title: t("catalog.replyTitle", { brand: brandName }),
    locale: lang,
    brandName,
    brandWebsite,
  });
};

