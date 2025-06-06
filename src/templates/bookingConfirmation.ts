import { baseTemplate } from "./baseTemplate";

interface AppointmentConfirmationParams {
  name: string;
  service: string;
  date: string;
  time: string;
  locale?: "de" | "tr" | "en";
}

export const BookingConfirmedTemplate = ({
  name,
  service,
  date,
  time,
  locale = "de",
}: AppointmentConfirmationParams): string => {
  const BRAND_NAME = process.env.BRAND_NAME ?? "anastasia";

  const translations = {
    de: {
      title: "✅ Termin bestätigt",
      greeting: `Hallo ${name},`,
      info: `Ihr Termin bei <strong>${BRAND_NAME}</strong> wurde erfolgreich <b>bestätigt</b>!`,
      instructions: "Wir freuen uns, Sie zum vereinbarten Zeitpunkt begrüßen zu dürfen.",
      serviceLabel: "🛠️ Service",
      dateLabel: "📅 Datum",
      timeLabel: "⏰ Uhrzeit",
      note: "Sollten Sie den Termin nicht wahrnehmen können, informieren Sie uns bitte rechtzeitig.",
      sign: `Herzliche Grüße,<br/><strong>Ihr ${BRAND_NAME} Team</strong>`,
    },
    tr: {
      title: "✅ Randevunuz Onaylandı",
      greeting: `Merhaba ${name},`,
      info: `Randevunuz <strong>${BRAND_NAME}</strong>'da <b>onaylandı!</b>`,
      instructions: "Belirtilen gün ve saatte sizi bekliyor olacağız.",
      serviceLabel: "🛠️ Hizmet",
      dateLabel: "📅 Tarih",
      timeLabel: "⏰ Saat",
      note: "Randevunuza gelemeyecekseniz lütfen en kısa sürede bize bildirin.",
      sign: `Saygılarımızla,<br/><strong>${BRAND_NAME} Ekibi</strong>`,
    },
    en: {
      title: "✅ Your Appointment is Confirmed",
      greeting: `Hello ${name},`,
      info: `Your appointment at <strong>${BRAND_NAME}</strong> has been <b>confirmed</b>!`,
      instructions: "We look forward to seeing you at the scheduled time.",
      serviceLabel: "🛠️ Service",
      dateLabel: "📅 Date",
      timeLabel: "⏰ Time",
      note: "If you are unable to attend, please let us know as soon as possible.",
      sign: `Best regards,<br/><strong>The ${BRAND_NAME} Team</strong>`,
    },
  };

  const t = translations[locale];

  const content = `
    <h2>${t.greeting}</h2>
    <p>${t.info}</p>
    <p>${t.instructions}</p>
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
