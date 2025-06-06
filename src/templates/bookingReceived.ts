import { baseTemplate } from "./baseTemplate";

interface AppointmentConfirmationParams {
  name: string;
  service: string;
  date: string;
  time: string;
  locale?: "de" | "tr" | "en";
}
export const BookingReceivedTemplate = ({
  name,
  service,
  date,
  time,
  locale = "de",
}: AppointmentConfirmationParams): string => {
  const BRAND_NAME = process.env.BRAND_NAME ?? "metahub";

  const translations = {
    de: {
      title: "🗓️ Terminanfrage erhalten",
      greeting: `Hallo ${name},`,
      info: `Ihre Terminanfrage bei <strong>${BRAND_NAME}</strong> ist eingegangen.`,
      wait: "Wir prüfen Ihren Wunschtermin und melden uns schnellstmöglich mit einer Bestätigung oder Alternativvorschlag.",
      serviceLabel: "🛠️ Service",
      dateLabel: "📅 Datum",
      timeLabel: "⏰ Uhrzeit",
      note: "Bitte warten Sie auf unsere Rückmeldung. Für Fragen erreichen Sie uns jederzeit.",
      sign: `Herzliche Grüße,<br/><strong>Ihr ${BRAND_NAME} Team</strong>`,
    },
    tr: {
      title: "🗓️ Randevu Talebiniz Alındı",
      greeting: `Merhaba ${name},`,
      info: `<strong>${BRAND_NAME}</strong>'ten randevu talebiniz başarıyla alınmıştır.`,
      wait: "Talebinizin uygunluğunu kontrol ediyoruz. Onay ya da alternatif için en kısa sürede size dönüş yapacağız.",
      serviceLabel: "🛠️ Hizmet",
      dateLabel: "📅 Tarih",
      timeLabel: "⏰ Saat",
      note: "Lütfen onay için bizden gelecek cevabı bekleyin. Her türlü sorunuz için iletişime geçebilirsiniz.",
      sign: `Saygılarımızla,<br/><strong>${BRAND_NAME} Ekibi</strong>`,
    },
    en: {
      title: "🗓️ Appointment Request Received",
      greeting: `Hello ${name},`,
      info: `Your appointment request with <strong>${BRAND_NAME}</strong> has been received.`,
      wait: "We are checking the availability for your requested time and will contact you soon with confirmation or alternatives.",
      serviceLabel: "🛠️ Service",
      dateLabel: "📅 Date",
      timeLabel: "⏰ Time",
      note: "Please wait for our confirmation. If you have questions, feel free to contact us.",
      sign: `Best regards,<br/><strong>The ${BRAND_NAME} Team</strong>`,
    },
  };

  const t = translations[locale];

  const content = `
    <h2>${t.greeting}</h2>
    <p>${t.info}</p>
    <p>${t.wait}</p>
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
    <p style="margin-top: 30px;">${t.sign}</p>
  `;

  return baseTemplate(content, t.title);
};
