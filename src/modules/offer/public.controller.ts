// modules/offers/public.controller.ts
import { Request, Response } from "express";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { v4 as uuidv4 } from "uuid";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";
import { SUPPORTED_LOCALES } from "@/types/common";
import logger from "@/core/middleware/logger/logger";

/** i18n: Tüm diller için TranslatedLabel üretir */
function i18nAll(key: string, params?: Record<string, any>) {
  const out: Record<string, string> = {};
  for (const l of SUPPORTED_LOCALES) {
    out[l] = translate(key, l as SupportedLocale, translations, params);
  }
  return out;
}

/** Tek bir string’ten tüm dillere aynı değeri basar */
function makeTLFrom(value = "") {
  const obj: Record<string, string> = {};
  for (const l of SUPPORTED_LOCALES) obj[l] = value;
  return obj;
}

// 👇 Admin’lere bildirim (başlık/mesaj tamamen i18n’den)
async function notifyAdminsOnOfferRequest(
  req: Request,
  {
    offerId,
    customerName,
    productLabel,
  }: { offerId: string; customerName: string; productLabel: string }
) {
  try {
    const { Notification } = await getTenantModels(req);

    const title = i18nAll("notifications.offerRequest.title");
    const message = i18nAll("notifications.offerRequest.message", {
      customerName,
      productLabel,
    });

    await Notification.create({
      tenant: (req as any).tenant,
      type: "info",
      title,
      message,
      target: { roles: ["admin"] },
      channels: ["inapp"],
      source: {
        module: "offers",
        entity: "offer",
        refId: offerId,
        event: "offer.requested",
      },
      link: {
        routeName: "admin.offers.detail",
        params: { id: offerId },
        href: `/admin/offers/${offerId}`,
      },
      priority: 3,
      isActive: true,
      tags: ["offers", "request", "public"],
    });
  } catch (e: any) {
    logger.withReq.warn(req, "[OFFER_REQUEST_NOTIFY_ERROR]", { error: e?.message });
  }
}

// PUBLIC: Ana sayfa teklif isteği
export async function requestOfferHandler(req: Request, res: Response) {
  const locale: SupportedLocale = (req as any).locale || getLogLocale();
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  try {
    const { Customer, Offer, Ensotekprod, Sparepart } = await getTenantModels(req);

    const {
      name,
      email,
      company,
      phone,
      message,
      productId,
      productType, // "ensotekprod" | "sparepart"
    } = req.body;

    if (!name || !email || !company || !phone || !productId || !productType) {
      res.status(400).json({ success: false, message: t("errors.required_fields") });
      return;
    }

    if (!["ensotekprod", "sparepart"].includes(String(productType))) {
      res.status(400).json({ success: false, message: t("validation.invalidProductType") });
      return;
    }

    // müşteriyi (tenant+email) tekille
    let customer = await Customer.findOne({ email, tenant: req.tenant });
    if (!customer) {
      customer = await Customer.create({
        tenant: req.tenant,
        companyName: company,
        contactName: name,
        email,
        phone,
        isActive: false,
        notes: "Public teklif isteği ile otomatik oluşturuldu.",
      });
    }

    // kalem oluştur
    let productDoc: any = null;
    const item: any = {
      productType,
      quantity: 1,
      unitPrice: 0,
      customPrice: 0,
      vat: 19,
      total: 0,
    };

    if (productType === "ensotekprod") {
      productDoc = await Ensotekprod.findOne({ _id: productId, tenant: req.tenant }).select("name price");
      if (!productDoc) {
        res.status(404).json({ success: false, message: t("errors.ensotekprod_not_found", { id: productId }) });
        return;
      }
      item.ensotekprod = productDoc._id;
      item.productName = productDoc.name;
      item.unitPrice = Number(productDoc?.price || 0);
      item.customPrice = Number(productDoc?.price || 0);
    } else {
      // sparepart
      productDoc = await Sparepart.findOne({ _id: productId, tenant: req.tenant }).select("name price");
      if (!productDoc) {
        res.status(404).json({ success: false, message: t("errors.sparepart_not_found") });
        return;
      }
      item.sparepart = productDoc._id;
      item.productName = productDoc.name;
      item.unitPrice = Number(productDoc?.price || 0);
      item.customPrice = Number(productDoc?.price || 0);
    }

    // item.total’ı pre-validate hook zaten dolduracak, burada 0 bırakmak güvenli
    const offer = await Offer.create({
      offerNumber: `OFR-${uuidv4().slice(0, 8)}`,
      tenant: req.tenant,
      user: null,
      company: null,
      customer: customer._id,
      items: [item],
      shippingCost: 0,
      additionalFees: 0,
      discount: 0,
      currency: "EUR",
      validUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      notes: makeTLFrom(message || ""),
      paymentTerms: makeTLFrom(""),
      status: "draft",
      totalNet: 0,
      totalVat: 0,
      totalGross: 0,
      sentByEmail: false,
      pdfUrl: "",
      createdBy: null,
      source: "publicForm",
    });

    // 🔔 Admin’e in-app bildirim
    await notifyAdminsOnOfferRequest(req, {
      offerId: String(offer._id),
      customerName: customer.contactName || customer.companyName || email,
      productLabel:
        productDoc?.name?.[locale] ||
        productDoc?.name?.en ||
        productDoc?.name ||
        "—",
    });

    logger.withReq.info(req, "[PUBLIC_OFFER_REQUEST]", {
      tenant: req.tenant,
      offerId: offer._id,
      productType,
      productId,
    });

    res.status(201).json({
      success: true,
      message: t("success.requested"),
      offerId: offer._id,
      customerId: customer._id,
    });
    return;
  } catch (err: any) {
    logger.withReq.error(req, "[PUBLIC_OFFER_REQUEST_ERROR]", { error: err?.message });
    res.status(500).json({ success: false, message: err.message || "Internal server error" });
    return;
  }
}
