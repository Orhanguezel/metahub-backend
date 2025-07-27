// src/templates/orderConfirmationTemplate.ts
import { baseTemplate } from "@/templates/baseTemplate";
import type { SupportedLocale } from "@/types/common";
import { SUPPORTED_LOCALES } from "@/types/common"; // 👈 unutma: ayrı export edilmişse böyle import et
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
  brandWebsite?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  criticalStockWarnings?: string;
  couponCode?: string | null;
  discount?: number;
  finalTotal?: number;
}

// Tek dil için HTML template üretir
function generateHtml(params: OrderConfirmationParams & { locale: SupportedLocale }): string {
  const {
    name,
    itemsList,
    totalPrice,
    locale,
    senderEmail,
    orderId,
    brandName,
    brandWebsite,
    paymentMethod,
    paymentStatus,
    criticalStockWarnings,
    couponCode,
    discount,
    finalTotal,
  } = params;

  const tr = translations[locale] || translations["en"];
  const tL = (key: string, p?: any) => t(key, locale, tr, p);
  const brand = brandName ?? "MetaHub";

  const content = `
    <h2>${tL("greeting", { name })}</h2>
    <p>${tL("thankYou")}</p>
    <p>${tL("status")}</p>

    <table style="margin-top: 20px; border-collapse: collapse;">
      ${orderId ? `<tr><td><strong>${tL("labelOrderId")}:</strong></td><td>${orderId}</td></tr>` : ""}
      ${brandName ? `<tr><td><strong>${tL("labelBrand")}:</strong></td><td>${brandName}</td></tr>` : ""}
      <tr><td><strong>${tL("labelItems")}:</strong></td><td>${itemsList}</td></tr>
      <tr><td><strong>${tL("labelTotal")}:</strong></td><td>€${totalPrice.toFixed(2)}</td></tr>
      ${discount ? `<tr><td><strong>${tL("labelDiscount")}:</strong></td><td>-€${discount.toFixed(2)}</td></tr>` : ""}
      ${couponCode ? `<tr><td><strong>${tL("labelCoupon")}:</strong></td><td>${couponCode}</td></tr>` : ""}
      <tr><td><strong>${tL("labelFinalTotal")}:</strong></td><td>€${(finalTotal ?? totalPrice).toFixed(2)}</td></tr>
      ${paymentMethod ? `<tr><td><strong>${tL("labelPaymentMethod")}:</strong></td><td>${paymentMethod}</td></tr>` : ""}
      ${paymentStatus ? `<tr><td><strong>${tL("labelPaymentStatus")}:</strong></td><td>${paymentStatus}</td></tr>` : ""}
    </table>

    ${criticalStockWarnings ? `<div style="margin-top:15px; color: #c00; font-weight:bold;">${criticalStockWarnings}</div>` : ""}

    <p style="margin-top: 20px;">${tL("shipping")}</p>
    <p>${tL("sign")}</p>
    <p style="font-size:12px;color:#999;">${brand}${senderEmail ? ` | ${senderEmail}` : ""}</p>
  `;

  return baseTemplate({
    content,
    title: tL("title"),
    locale,
    brandName: brand,
    brandWebsite,
  });
}

// Çoklu dil destekli şablon export
export const orderConfirmationTemplate = (
  params: OrderConfirmationParams
): string | Record<SupportedLocale, string> => {
  const { locale = "en" } = params;

  // Tek dil
  if (typeof locale === "string") {
    return generateHtml({
      ...params,
      locale,
    });
  }

  // Çoklu dil
  const result: Partial<Record<SupportedLocale, string>> = {};

  for (const lang of locale) {
    result[lang] = generateHtml({
      ...params,
      locale: lang,
    });
  }

  return result as Record<SupportedLocale, string>;
};
