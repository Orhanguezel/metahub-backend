import logger from "@/core/middleware/logger/logger";
import translations from "@/templates/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";

// 🔧 Default fallback (çalışmazsa .env'den)
const DEFAULT_BRAND_NAME = process.env.BRAND_NAME ?? "MetaHub";
const DEFAULT_BRAND_WEBSITE = process.env.BRAND_WEBSITE ?? "https://guezelwebdesign.com";

interface BaseTemplateOptions {
  content: string;
  title?: string;
  locale?: SupportedLocale;
  brandName?: string;       // ✨ Tenant'tan gelen marka adı
  brandWebsite?: string;    // ✨ Tenant'tan gelen web sitesi
}

export const baseTemplate = ({
  content,
  title,
  locale,
  brandName,
  brandWebsite,
}: BaseTemplateOptions): string => {
  const _locale = locale ?? getLogLocale();
  const tTrans = translations[_locale] || translations["en"];
  const year = new Date().getFullYear();

  const _brand = brandName ?? DEFAULT_BRAND_NAME;
  const _website = brandWebsite ?? DEFAULT_BRAND_WEBSITE;
  const _websiteClean = _website.replace(/^https?:\/\//, "");

  const footerRights = tTrans["footer.rights"]
    .replace("{year}", String(year))
    .replace("{brand}", _brand);

  const footerWebsite = tTrans["footer.website"].replace("{domain}", _websiteClean);

  logger.debug(
    `[EmailTemplate] Rendered for locale: ${_locale} | title: ${title ?? _brand}`
  );

  return `
    <!DOCTYPE html>
    <html lang="${_locale}">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title ?? _brand}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: #f4f6f8;
            color: #2c3e50;
            padding: 2rem;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            border: 1px solid #e0e0e0;
          }
          .footer {
            margin-top: 2rem;
            font-size: 0.85rem;
            color: #7f8c8d;
            text-align: center;
          }
          a {
            color: #7c3aed;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          ${content}
          <div class="footer">
            ${footerRights}<br/>
            <a href="${_website}">${footerWebsite}</a>
          </div>
        </div>
      </body>
    </html>
  `;
};
