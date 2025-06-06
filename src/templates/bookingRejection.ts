// src/templates/bookingRejection.ts
import { baseTemplate } from "./baseTemplate";

interface BookingRejectionParams {
  name: string;
  service: string;
  date: string;
  time: string;
  locale?: "de" | "tr" | "en";
}

export function BookingRejectionTemplate({
  name,
  service,
  date,
  time,
  locale = "de",
}: BookingRejectionParams): string {
  const BRAND_NAME = process.env.BRAND_NAME ?? "anastasia";

  const translations = {
    de: {
      title: "❌ Termin leider abgelehnt",
      greeting: `Hallo ${name},`,
      info: `leider können wir Ihren Terminwunsch für <b>${service}</b> am <b>${date}</b> um <b>${time}</b> aufgrund von Auslastung oder anderen Gründen nicht bestätigen.`,
      closing: "Danke für Ihr Verständnis.",
      sign: `Herzliche Grüße,<br/><strong>Ihr ${BRAND_NAME} Team</strong>`,
    },
    tr: {
      title: "❌ Randevu Talebiniz Reddedildi",
      greeting: `Merhaba ${name},`,
      info: `<b>${service}</b> için <b>${date}</b> tarihinde <b>${time}</b> saatinde talep ettiğiniz randevuyu maalesef yoğunluk nedeniyle onaylayamıyoruz.`,
      closing: "Anlayışınız için teşekkür ederiz.",
      sign: `Saygılarımızla,<br/><strong>${BRAND_NAME} Ekibi</strong>`,
    },
    en: {
      title: "❌ Appointment Rejected",
      greeting: `Hello ${name},`,
      info: `Unfortunately, we are unable to confirm your appointment request for <b>${service}</b> on <b>${date}</b> at <b>${time}</b> due to high demand or other reasons.`,
      closing: "Thank you for your understanding.",
      sign: `Best regards,<br/><strong>The ${BRAND_NAME} Team</strong>`,
    },
  };

  const t = translations[locale];

  const content = `
    <h2>${t.greeting}</h2>
    <p>${t.info}</p>
    <p>${t.closing}</p>
    <p style="margin-top: 30px;">${t.sign}</p>
  `;

  return baseTemplate(content, t.title);
}
