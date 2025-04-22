import { baseTemplate } from "./baseTemplate";

interface OrderConfirmationParams {
  name: string;
  itemsList: string;
  totalPrice: number;
  locale?: "de" | "tr" | "en";
}

const BRAND_NAME = process.env.BRAND_NAME || "Ensotek";
const BRAND_TEAM = process.env.BRAND_TEAM_NAME || `${BRAND_NAME} Team`;

export const orderConfirmationTemplate = ({
  name,
  itemsList,
  totalPrice,
  locale = "de",
}: OrderConfirmationParams): string => {
  const translations = {
    de: {
      title: "🧾 Bestellbestätigung",
      greeting: `Hallo ${name},`,
      thankYou: `Vielen Dank für Ihre Bestellung bei <strong>${BRAND_NAME}</strong>.`,
      status: "Ihre Bestellung wurde erfolgreich aufgegeben und wird nun bearbeitet.",
      labelItems: "🛍️ Produkte",
      labelTotal: "💰 Gesamtpreis",
      shipping: "Sie erhalten eine Benachrichtigung, sobald Ihre Bestellung versendet wurde.",
      sign: `Mit freundlichen Grüßen,<br/>Ihr ${BRAND_TEAM}`,
    },
    tr: {
      title: "🧾 Sipariş Onayı",
      greeting: `Merhaba ${name},`,
      thankYou: `<strong>${BRAND_NAME}</strong>'ten sipariş verdiğiniz için teşekkür ederiz.`,
      status: "Siparişiniz başarıyla alındı ve işleme alındı.",
      labelItems: "🛍️ Ürünler",
      labelTotal: "💰 Toplam Tutar",
      shipping: "Siparişiniz kargoya verildiğinde bilgilendirileceksiniz.",
      sign: `Saygılarımızla,<br/>${BRAND_TEAM}`,
    },
    en: {
      title: "🧾 Order Confirmation",
      greeting: `Hello ${name},`,
      thankYou: `Thank you for your order at <strong>${BRAND_NAME}</strong>.`,
      status: "Your order has been received and is now being processed.",
      labelItems: "🛍️ Items",
      labelTotal: "💰 Total Price",
      shipping: "You’ll be notified once your order is shipped.",
      sign: `Best regards,<br/>The ${BRAND_TEAM}`,
    },
  };

  const t = translations[locale];

  const content = `
    <h2>${t.greeting}</h2>
    <p>${t.thankYou}</p>
    <p>${t.status}</p>

    <table style="margin-top: 20px; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 12px;"><strong>${t.labelItems}:</strong></td>
        <td style="padding: 8px 12px;">${itemsList}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px;"><strong>${t.labelTotal}:</strong></td>
        <td style="padding: 8px 12px;">€${totalPrice.toFixed(2)}</td>
      </tr>
    </table>

    <p style="margin-top: 20px;">${t.shipping}</p>
    <p>${t.sign}</p>
  `;

  return baseTemplate(content, t.title);
};
