// src/templates/bookingRejection.ts
import { baseTemplate } from "@/templates/baseTemplate";
import logger from "@/core/middleware/logger/logger";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "@/templates/i18n";
import type { SupportedLocale } from "@/types/common";

interface BookingRejectionParams {
  name: string;
  service: string;
  date: string;
  time: string;
  locale: SupportedLocale;
  brandName: string; // EKLENDİ
  senderEmail?: string; // Gerekirse
  req?: any; // Gerekirse, örneğin logger için
}

export function BookingRejectionTemplate({
  name,
  service,
  date,
  time,
  locale,
  brandName,
  req
}: BookingRejectionParams): string {
  const t = (key: string, params?: any) =>
    translate(key, locale, translations, params);

  const content = `
    <h2>${t("booking.rejection.greeting", { name })}</h2>
    <p>${t("booking.rejection.info", { service, date, time })}</p>
    <p>${t("booking.rejection.closing")}</p>
    <p style="margin-top: 30px;">${t("booking.rejection.sign", {
      brand: brandName,
    })}</p>
  `;

  logger.withReq.debug(
    req,
    `[EmailTemplate] Booking REJECTION generated for ${name} | lang: ${locale}`
  );

  return baseTemplate(content, t("booking.rejection.title"));
}
