import { baseTemplate } from "./baseTemplate";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// 🔄 Ortama özel .env dosyasını yükle
const envProfile = process.env.APP_ENV || "ensotek";
const envPath = path.resolve(process.cwd(), `.env.${envProfile}`);
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const BRAND_NAME = process.env.BRAND_NAME || "Ensotek";

interface AppointmentConfirmationParams {
  name: string;
  service: string;
  date: string;
  time: string;
  locale?: "de" | "tr" | "en";
}

export const BookingConfirmationTemplate = ({
  name,
  service,
  date,
  time,
  locale = "de",
}: AppointmentConfirmationParams): string => {
  const translations = {
    de: {
      title: "🗓️ Terminbestätigung",
      greeting: `Hallo ${name},`,
      thanks: `vielen Dank für Ihre Terminbuchung bei <strong>${BRAND_NAME}</strong>.`,
      received: "Ihre Anfrage wurde erfolgreich empfangen und wird nun verarbeitet.",
      serviceLabel: "🛠️ Service",
      dateLabel: "📅 Datum",
      timeLabel: "⏰ Uhrzeit",
      note: "Sollten Sie Fragen oder Änderungswünsche haben, kontaktieren Sie uns bitte rechtzeitig.",
      closing: "Wir freuen uns, Sie bald persönlich begrüßen zu dürfen.",
      sign: `Herzliche Grüße,<br/><strong>Ihr ${BRAND_NAME} Team</strong>`,
    },
    tr: {
      title: "🗓️ Randevu Onayı",
      greeting: `Merhaba ${name},`,
      thanks: `<strong>${BRAND_NAME}</strong>'ten randevu aldığınız için teşekkür ederiz.`,
      received: "Talebiniz başarıyla alındı ve işleniyor.",
      serviceLabel: "🛠️ Hizmet",
      dateLabel: "📅 Tarih",
      timeLabel: "⏰ Saat",
      note: "Herhangi bir sorunuz veya değişiklik talebiniz varsa lütfen bizimle iletişime geçin.",
      closing: "Sizi yakında ağırlamaktan memnuniyet duyarız.",
      sign: `Saygılarımızla,<br/><strong>${BRAND_NAME} Ekibi</strong>`,
    },
    en: {
      title: "🗓️ Appointment Confirmation",
      greeting: `Hello ${name},`,
      thanks: `Thank you for booking an appointment with <strong>${BRAND_NAME}</strong>.`,
      received: "We have successfully received your request and it's now being processed.",
      serviceLabel: "🛠️ Service",
      dateLabel: "📅 Date",
      timeLabel: "⏰ Time",
      note: "If you have any questions or need to make changes, please contact us in advance.",
      closing: "We look forward to welcoming you soon.",
      sign: `Best regards,<br/><strong>The ${BRAND_NAME} Team</strong>`,
    },
  };

  const t = translations[locale];

  const content = `
    <h2>${t.greeting}</h2>
    <p>${t.thanks}</p>
    <p>${t.received}</p>

    <table style="margin-top: 20px; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 12px;"><strong>${t.serviceLabel}:</strong></td>
        <td style="padding: 8px 12px;">${service}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px;"><strong>${t.dateLabel}:</strong></td>
        <td style="padding: 8px 12px;">${date}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px;"><strong>${t.timeLabel}:</strong></td>
        <td style="padding: 8px 12px;">${time}</td>
      </tr>
    </table>

    <p style="margin-top: 20px;">${t.note}</p>
    <p>${t.closing}</p>
    <p style="margin-top: 30px;">${t.sign}</p>
  `;

  return baseTemplate(content, t.title);
};
