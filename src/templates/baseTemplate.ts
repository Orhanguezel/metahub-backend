import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/templates/i18n"; // <-- Email template çeviri dosyan
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";

const BRAND_NAME = process.env.BRAND_NAME ?? "MeteHuB";
const BRAND_WEBSITE =
  process.env.BRAND_WEBSITE ?? "https://guezelwebdesign.com";

/**
 * Returns a fully formatted HTML email template.
 *
 * @param content - The HTML content inside the email container.
 * @param title - The <title> of the email document. Defaults to BRAND_NAME.
 * @param locale - (optional) override for language (default: process.env.LOG_LOCALE ya da "en")
 * @returns Full HTML document string.
 */
export const baseTemplate = (
  content: string,
  title: string = BRAND_NAME,
  locale?: SupportedLocale
): string => {
  // --- DİL SEÇİMİ (her yerde aynı) ---
  const _locale = getLogLocale();
  const tTrans = translations[_locale] || translations["en"];
  const year = new Date().getFullYear();
  const domain = BRAND_WEBSITE.replace(/^https?:\/\//, "");

  // --- Footer çok dilli metinler (tanslation dosyasından) ---
  const footerRights = tTrans["footer.rights"]
    .replace("{year}", String(year))
    .replace("{brand}", BRAND_NAME);
  const footerWebsite = tTrans["footer.website"].replace("{domain}", domain);

  // --- LOG: Template hangi dilde render edildiğini isteğe bağlı loglayabilirsin ---
  logger.debug(
    `[EmailTemplate] Rendered for locale: ${_locale} | title: ${title}`
  );

  return `
    <!DOCTYPE html>
    <html lang="${_locale}">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
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
            <a href="${BRAND_WEBSITE}">${footerWebsite}</a>
          </div>
        </div>
      </body>
    </html>
  `;
};
