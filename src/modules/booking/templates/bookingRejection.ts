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
  brandName: string;
  brandWebsite?: string;

  // Logger context
  tenant?: string;
  userId?: string;
  ip?: string;
  loggerLocale?: SupportedLocale;
}

export function BookingRejectionTemplate({
  name,
  service,
  date,
  time,
  locale,
  brandName,
  brandWebsite,
  tenant,
  userId,
  ip,
  loggerLocale,
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

  logger.debug(`[EmailTemplate] Booking REJECTION generated`, {
    module: "booking",
    event: "booking.email.rejection",
    status: "info",
    tenant,
    userId,
    ip,
    locale: loggerLocale || locale,
    meta: {
      name,
      service,
      date,
      time,
    },
  });

  return baseTemplate({
    content,
    title: t("booking.rejection.title"),
    locale,
    brandName,
    brandWebsite,
  });
}
