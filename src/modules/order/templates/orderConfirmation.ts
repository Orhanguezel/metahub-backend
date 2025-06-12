// /modules/order/templates/orderConfirmation.ts
import { baseTemplate } from "@/templates/baseTemplate";
import type { SupportedLocale } from "@/types/common";
import translations from "@/modules/order/i18n";
import { t } from "@/core/utils/i18n/translate";

interface OrderConfirmationParams {
  name: string;
  itemsList: string;
  totalPrice: number;
  locale?: SupportedLocale; 
}

export const orderConfirmationTemplate = ({
  name,
  itemsList,
  totalPrice,
  locale = "en",
}: OrderConfirmationParams): string => {
  const tr = translations[locale] || translations["en"];
  const interpolate = (str: string) => str.replace("{name}", name);

  const content = `
    <h2>${interpolate(tr.greeting)}</h2>
    <p>${tr.thankYou}</p>
    <p>${tr.status}</p>
    <table style="margin-top: 20px; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 12px;"><strong>${tr.labelItems}:</strong></td>
        <td style="padding: 8px 12px;">${itemsList}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px;"><strong>${tr.labelTotal}:</strong></td>
        <td style="padding: 8px 12px;">€${totalPrice.toFixed(2)}</td>
      </tr>
    </table>
    <p style="margin-top: 20px;">${tr.shipping}</p>
    <p>${tr.sign}</p>
  `;
  return baseTemplate(content, tr.title);
};
