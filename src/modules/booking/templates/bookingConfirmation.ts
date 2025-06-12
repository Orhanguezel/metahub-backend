import { baseTemplate } from "@/templates/baseTemplate";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/templates/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";

interface AppointmentConfirmationParams {
  name: string;
  service: string;
  date: string;
  time: string;
  locale?: SupportedLocale;
}

export const BookingConfirmedTemplate = ({
  name,
  service,
  date,
  time,
  locale,
}: AppointmentConfirmationParams): string => {
  // Standart: Dil seçimi her zaman getLogLocale()
  const lang = getLogLocale(); // Argümansız! (env veya fallback)
  const tTrans = translations[lang] || translations["en"];
  const BRAND_NAME = process.env.BRAND_NAME ?? "anastasia";

  // i18n ile tüm metinler translation dosyasından
  const content = `
    <h2>${t("booking.greeting", lang, tTrans, { name })}</h2>
    <p>${t("booking.info", lang, tTrans, { brand: BRAND_NAME })}</p>
    <p>${t("booking.instructions", lang, tTrans)}</p>
    <table style="margin-top: 20px; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 12px;"><strong>${t(
          "booking.serviceLabel",
          lang,
          tTrans
        )}:</strong></td>
        <td style="padding: 8px 12px;">${service}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px;"><strong>${t(
          "booking.dateLabel",
          lang,
          tTrans
        )}:</strong></td>
        <td style="padding: 8px 12px;">${date}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px;"><strong>${t(
          "booking.timeLabel",
          lang,
          tTrans
        )}:</strong></td>
        <td style="padding: 8px 12px;">${time}</td>
      </tr>
    </table>
    <p style="margin-top: 20px;">${t("booking.note", lang, tTrans)}</p>
    <p style="margin-top: 30px;">${t("booking.sign", lang, tTrans, {
      brand: BRAND_NAME,
    })}</p>
  `;

  // Logger ile hangi dilde üretildiğini takip edebilirsin
  logger.debug(
    `[EmailTemplate] Booking confirmation generated for ${name} | lang: ${lang}`
  );

  // Email başlığında da i18n
  return baseTemplate(content, t("booking.title", lang, tTrans));
};
