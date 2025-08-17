// src/templates/offerEmailTemplate.ts
import { baseTemplate } from "@/templates/baseTemplate";
import type { SupportedLocale } from "@/types/common";
import translations from "../i18n";
import { t as translate } from "@/core/utils/i18n/translate";

/**
 * E-posta içinde satır tablosu için temel tip.
 * Parasal değerleri (unitPrice / total / ara toplam vb.) locale + currency formatı verilmiş string olarak gönderiyoruz.
 */
export interface OfferEmailItemRow {
  name: string;
  qty: number;
  unitPrice: string;
  total: string;
}

export interface OfferEmailParams {
  offerNumber: string;
  name?: string;                 // Müşteri ad/temsilci
  rows: OfferEmailItemRow[];     // Ürün kalem tablosu
  subtotal: string;
  vat: string;
  shipping?: string;
  fees?: string;
  discount?: string;             // eksi işaretini dışarıda koy; burada formatlanmış metin
  grandTotal: string;

  currency: string;
  validUntil?: string;

  viewUrl?: string;              // panel linki
  pdfUrl?: string;               // PDF linki

  brandName?: string;
  brandWebsite?: string;         // baseTemplate’e geçer
  senderEmail?: string;

  locale?: SupportedLocale | SupportedLocale[];
}

/** Lokalize metin yardımcıları (offers/i18n üzerinden) */
function L(key: string, locale: SupportedLocale, params?: Record<string, any>) {
  return translate(`email.offer.${key}`, locale, translations as any, params);
}

function renderSingle(params: OfferEmailParams & { locale: SupportedLocale }): string {
  const {
    locale, offerNumber, name, rows,
    subtotal, vat, shipping, fees, discount, grandTotal,
    viewUrl, pdfUrl, validUntil, brandName, brandWebsite, senderEmail,
  } = params;

  const titleStr   = L("title",   locale, { no: offerNumber }) || `Offer ${offerNumber}`;
  const hiStr      = L("hi",      locale, { name }) || (name ? `Hello ${name},` : "Hello,");
  const introStr   = L("intro",   locale, { brand: brandName || "Our Company", no: offerNumber });

  const labels = {
    items:      L("items",      locale),
    qty:        L("qty",        locale),
    unit:       L("unit",       locale),
    total:      L("total",      locale),
    subtotal:   L("subtotal",   locale),
    vat:        L("vat",        locale),
    shipping:   L("shipping",   locale),
    fees:       L("fees",       locale),
    discount:   L("discount",   locale),
    grandTotal: L("grandTotal", locale),
    validUntil: L("validUntil", locale),
    ctaView:    L("ctaView",    locale),
    ctaPdf:     L("ctaPdf",     locale),
    questions:  L("questions",  locale),
    sign:       L("sign",       locale, { brand: brandName || "", sender: senderEmail || "" }),
  };

  const rowsHtml = rows
    .map(
      r => `
      <tr>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;">${r.name}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:center;">${r.qty}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;">${r.unitPrice}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;"><strong>${r.total}</strong></td>
      </tr>`
    )
    .join("");

  const totalsHtml = `
    <table style="width:100%;margin-top:8px">
      <tr><td style="text-align:right;padding:2px 0">${labels.subtotal}</td><td style="text-align:right;padding:2px 0"><strong>${subtotal}</strong></td></tr>
      <tr><td style="text-align:right;padding:2px 0">${labels.vat}</td><td style="text-align:right;padding:2px 0"><strong>${vat}</strong></td></tr>
      ${shipping ? `<tr><td style="text-align:right;padding:2px 0">${labels.shipping}</td><td style="text-align:right;padding:2px 0"><strong>${shipping}</strong></td></tr>` : ""}
      ${fees ? `<tr><td style="text-align:right;padding:2px 0">${labels.fees}</td><td style="text-align:right;padding:2px 0"><strong>${fees}</strong></td></tr>` : ""}
      ${discount ? `<tr><td style="text-align:right;padding:2px 0">${labels.discount}</td><td style="text-align:right;padding:2px 0"><strong>${discount}</strong></td></tr>` : ""}
      <tr><td style="text-align:right;padding:6px 0;font-size:15px"><strong>${labels.grandTotal}</strong></td><td style="text-align:right;padding:6px 0;font-size:15px"><strong>${grandTotal}</strong></td></tr>
    </table>
  `;

  const content = `
    <h2 style="margin:0 0 10px">${hiStr}</h2>
    <p style="margin:0 0 12px">${introStr}</p>

    <table style="width:100%;border-collapse:collapse;margin-top:4px">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px 6px;border-bottom:2px solid #000;">${labels.items}</th>
          <th style="text-align:center;padding:8px 6px;border-bottom:2px solid #000;width:70px">${labels.qty}</th>
          <th style="text-align:right;padding:8px 6px;border-bottom:2px solid #000;width:120px">${labels.unit}</th>
          <th style="text-align:right;padding:8px 6px;border-bottom:2px solid #000;width:140px">${labels.total}</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    ${totalsHtml}

    ${validUntil ? `<p style="margin-top:10px"><em>${labels.validUntil}: ${validUntil}</em></p>` : ""}

    <div style="margin:16px 0">
      ${viewUrl ? `<a href="${viewUrl}" target="_blank" style="display:inline-block;margin-right:8px">${labels.ctaView}</a>` : ""}
      ${pdfUrl  ? `<a href="${pdfUrl}" target="_blank"  style="display:inline-block">${labels.ctaPdf}</a>` : ""}
    </div>

    <p style="margin:16px 0 6px">${labels.questions}</p>
    <p style="font-size:12px;color:#888">${labels.sign}</p>
  `;

  return baseTemplate({
    content,
    title: titleStr,
    locale,
    brandName,
    brandWebsite,
  });
}

/** Tek dil için HTML döner veya çoklu dil için locale->html map */
export function offerEmailTemplate(
  params: OfferEmailParams
): string | Record<SupportedLocale, string> {
  const { locale = "en" } = params;
  if (typeof locale === "string") {
    return renderSingle({ ...params, locale });
  }
  const out: Partial<Record<SupportedLocale, string>> = {};
  for (const lang of locale) {
    out[lang] = renderSingle({ ...params, locale: lang });
  }
  return out as Record<SupportedLocale, string>;
}

/** Konu üretici (tek dil) – i18n’den */
export function offerEmailSubject(
  offerNumber: string,
  locale: SupportedLocale = "en"
): string {
  return (
    L("subject", locale, { no: offerNumber }) ||
    L("title", locale, { no: offerNumber }) ||
    `Offer ${offerNumber}`
  );
}
