import { baseTemplate } from "@/templates/baseTemplate";
import type { SupportedLocale } from "@/types/common";
import translations from "@/modules/order/i18n";
import { t } from "@/core/utils/i18n/translate";

export interface OrderConfirmationParams {
  name: string;
  itemsList: string;
  totalPrice: number;
  locale?: SupportedLocale | SupportedLocale[];
  senderEmail?: string;
  orderId?: string;
  brandName?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  criticalStockWarnings?: string;
  couponCode?: string | null;
  discount?: number;
  finalTotal?: number;
}

// Helper: tek dil için HTML döndürür
function orderConfirmationHtml({
  name,
  itemsList,
  totalPrice,
  locale = "en",
  senderEmail,
  orderId,
  brandName,
  paymentMethod,
  paymentStatus,
  criticalStockWarnings,
  couponCode,
  discount,
  finalTotal,
}: Omit<OrderConfirmationParams, "locale"> & { locale: SupportedLocale }): string {
  // Kısa, anlaşılır ve nötr isimlendirme:
  const labels = translations[locale] || translations["en"];
  const interpolate = (str: string) => str.replace("{name}", name);

  return baseTemplate(
    `
    <h2>${interpolate(labels.greeting)}</h2>
    <p>${labels.thankYou}</p>
    <p>${labels.status}</p>
    <table style="margin-top: 20px; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 12px;"><strong>${labels.labelOrderId ?? "Order ID"}:</strong></td>
        <td style="padding: 8px 12px;">${orderId ?? "-"}</td>
      </tr>
      ${brandName ? `
      <tr>
        <td style="padding: 8px 12px;"><strong>${labels.labelBrand ?? "Brand"}:</strong></td>
        <td style="padding: 8px 12px;">${brandName}</td>
      </tr>` : ""}
      <tr>
        <td style="padding: 8px 12px;"><strong>${labels.labelItems}:</strong></td>
        <td style="padding: 8px 12px;">${itemsList}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px;"><strong>${labels.labelTotal}:</strong></td>
        <td style="padding: 8px 12px;">€${totalPrice.toFixed(2)}</td>
      </tr>
      ${discount ? `
      <tr>
        <td style="padding: 8px 12px;"><strong>${labels.labelDiscount ?? "Discount"}:</strong></td>
        <td style="padding: 8px 12px;">-€${discount.toFixed(2)}</td>
      </tr>
      ` : ""}
      ${couponCode ? `
      <tr>
        <td style="padding: 8px 12px;"><strong>${labels.labelCoupon ?? "Coupon"}:</strong></td>
        <td style="padding: 8px 12px;">${couponCode}</td>
      </tr>
      ` : ""}
      <tr>
        <td style="padding: 8px 12px;"><strong>${labels.labelFinalTotal ?? "Final Total"}:</strong></td>
        <td style="padding: 8px 12px;">€${(finalTotal ?? totalPrice).toFixed(2)}</td>
      </tr>
      ${paymentMethod ? `
      <tr>
        <td style="padding: 8px 12px;"><strong>${labels.labelPaymentMethod ?? "Payment Method"}:</strong></td>
        <td style="padding: 8px 12px;">${paymentMethod}</td>
      </tr>
      ` : ""}
      ${paymentStatus ? `
      <tr>
        <td style="padding: 8px 12px;"><strong>${labels.labelPaymentStatus ?? "Payment Status"}:</strong></td>
        <td style="padding: 8px 12px;">${paymentStatus}</td>
      </tr>
      ` : ""}
    </table>
    ${criticalStockWarnings ? `<div style="margin-top:15px; color: #c00; font-weight:bold;">${criticalStockWarnings}</div>` : ""}
    <p style="margin-top: 20px;">${labels.shipping}</p>
    <p>${labels.sign}</p>
    ${brandName ? `<p style="font-size:12px;color:#999;">${brandName} ${senderEmail ? `| ${senderEmail}` : ""}</p>` : ""}
    `,
    labels.title
  );
}

// Çoklu dil için ana fonksiyon
export const orderConfirmationTemplate = (
  params: OrderConfirmationParams
): string | Record<SupportedLocale, string> => {
  if (!params.locale || typeof params.locale === "string") {
    return orderConfirmationHtml({
      ...params,
      locale: (params.locale as SupportedLocale) || "en",
    });
  }

  const result: Record<SupportedLocale, string> = {} as any;
  for (const lang of params.locale) {
    result[lang] = orderConfirmationHtml({
      ...params,
      locale: lang,
    });
  }
  return result;
};
