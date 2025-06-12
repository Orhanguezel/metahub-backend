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
}

export const BookingReceivedTemplate = ({
  name,
  service,
  date,
  time,
}: AppointmentConfirmationParams): string => {
  // Dil seçimi otomatik
  const lang = getLogLocale();
  const tTrans = translations[lang] || translations["en"];
  const BRAND_NAME = process.env.BRAND_NAME ?? "metahub";

  // i18n anahtarlarıyla content
  const content = `
    <h2>${t("booking.received.greeting", lang, tTrans, { name })}</h2>
    <p>${t("booking.received.info", lang, tTrans, { brand: BRAND_NAME })}</p>
    <p>${t("booking.received.wait", lang, tTrans)}</p>
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
    <p style="margin-top: 20px;">${t("booking.received.note", lang, tTrans)}</p>
    <p style="margin-top: 30px;">${t("booking.received.sign", lang, tTrans, {
      brand: BRAND_NAME,
    })}</p>
  `;

  logger.debug(
    `[EmailTemplate] Booking RECEIVED generated for ${name} | lang: ${lang}`
  );

  return baseTemplate(content, t("booking.received.title", lang, tTrans));
};
