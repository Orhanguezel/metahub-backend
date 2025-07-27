// src/modules/booking/templates/bookingReceived.ts
import { baseTemplate } from "@/templates/baseTemplate";
import logger from "@/core/middleware/logger/logger";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "@/templates/i18n";
import type { SupportedLocale } from "@/types/common";

interface BookingReceivedParams {
  name: string;
  service: string;
  date: string;
  time: string;
  locale?: SupportedLocale;
  brandName: string;
  senderEmail?: string;

  // Logger context (future-proof)
  tenant?: string;
  userId?: string;
  ip?: string;
  loggerLocale?: SupportedLocale;
}

export const BookingReceivedTemplate = ({
  name,
  service,
  date,
  time,
  locale,
  brandName,
  senderEmail,
  tenant,
  userId,
  ip,
  loggerLocale,
}: BookingReceivedParams): string => {
  const lang: SupportedLocale = locale || "en";
  const t = (key: string, params?: any) =>
    translate(key, lang, translations, params);

  const content = `
    <h2>${t("booking.received.greeting", { name })}</h2>
    <p>${t("booking.received.info", { brand: brandName })}</p>
    <p>${t("booking.received.wait")}</p>
    <table style="margin-top: 20px; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 12px;"><strong>${t("booking.serviceLabel")}:</strong></td>
        <td style="padding: 8px 12px;">${service}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px;"><strong>${t("booking.dateLabel")}:</strong></td>
        <td style="padding: 8px 12px;">${date}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px;"><strong>${t("booking.timeLabel")}:</strong></td>
        <td style="padding: 8px 12px;">${time}</td>
      </tr>
    </table>
    <p style="margin-top: 20px;">${t("booking.received.note")}</p>
    <p style="margin-top: 30px;">${t("booking.received.sign", { brand: brandName })}</p>
  `;

  logger.debug(`[EmailTemplate] Booking RECEIVED generated`, {
    module: "booking",
    event: "booking.email.received",
    status: "success",
    tenant,
    userId,
    ip,
    locale: loggerLocale || lang,
    meta: {
      name,
      service,
      date,
      time,
    },
  });

  return baseTemplate(content, t("booking.received.title"));
};
