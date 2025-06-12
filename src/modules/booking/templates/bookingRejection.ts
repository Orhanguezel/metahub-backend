// src/templates/bookingRejection.ts
import { baseTemplate } from "@/templates/baseTemplate";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/templates/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";

interface BookingRejectionParams {
  name: string;
  service: string;
  date: string;
  time: string;
}

export function BookingRejectionTemplate({
  name,
  service,
  date,
  time,
}: BookingRejectionParams): string {
  const lang = getLogLocale();
  const tTrans = translations[lang] || translations["en"];
  const BRAND_NAME = process.env.BRAND_NAME ?? "anastasia";

  const content = `
    <h2>${t("booking.rejection.greeting", lang, tTrans, { name })}</h2>
    <p>${t("booking.rejection.info", lang, tTrans, { service, date, time })}</p>
    <p>${t("booking.rejection.closing", lang, tTrans)}</p>
    <p style="margin-top: 30px;">${t("booking.rejection.sign", lang, tTrans, {
      brand: BRAND_NAME,
    })}</p>
  `;

  logger.debug(
    `[EmailTemplate] Booking REJECTION generated for ${name} | lang: ${lang}`
  );

  return baseTemplate(content, t("booking.rejection.title", lang, tTrans));
}
