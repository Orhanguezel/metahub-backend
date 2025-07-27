// src/modules/booking/templates/bookingConfirmation.ts
import { baseTemplate } from "@/templates/baseTemplate";
import logger from "@/core/middleware/logger/logger";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "@/templates/i18n";
import type { SupportedLocale } from "@/types/common";

interface BookingConfirmationParams {
  name: string;
  service: string;
  date: string;
  time: string;
  locale?: SupportedLocale;
  brandName: string;

  // 🔐 Logger context
  tenant?: string;
  userId?: string;
  ip?: string;
  loggerLocale?: SupportedLocale;
}

export const BookingConfirmedTemplate = ({
  name,
  service,
  date,
  time,
  locale,
  brandName,
  tenant,
  userId,
  ip,
  loggerLocale,
}: BookingConfirmationParams): string => {
  const lang: SupportedLocale = locale || "en";
  const t = (key: string, params?: any) =>
    translate(key, lang, translations, params);

  const content = `
    <h2>${t("booking.greeting", { name })}</h2>
    <p>${t("booking.info", { brand: brandName })}</p>
    <p>${t("booking.instructions")}</p>
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
    <p style="margin-top: 20px;">${t("booking.note")}</p>
    <p style="margin-top: 30px;">${t("booking.sign", { brand: brandName })}</p>
  `;

  logger.debug(`[EmailTemplate] Booking CONFIRMATION generated`, {
    module: "booking",
    event: "booking.email.confirmation",
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

  return baseTemplate(content, t("booking.title"));
};
