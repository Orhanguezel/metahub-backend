// modules/offers/admin.controller.ts
import { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";
import { SUPPORTED_LOCALES, getDateLocale } from "@/types/common";
import logger from "@/core/middleware/logger/logger";
import { generateOfferPdf } from "@/core/pdf/generateOfferPdf";
import { sendEmail } from "@/services/emailService";
import { getTenantMailContext } from "@/core/middleware/tenant/getTenantMailContext";
import { offerEmailTemplate, offerEmailSubject } from "./templates/offerEmailTemplate";

/** Çok dilli boş obje */
function emptyTL(locales: readonly string[]) {
  const obj: Record<string, string> = {};
  for (const l of locales) obj[l] = "";
  return obj;
}

/** TL → string */
function resolveTL(tl: any, locale: SupportedLocale): string {
  if (!tl) return "";
  if (typeof tl === "string") return tl;
  return tl[locale] || tl.en || (Object.values(tl).find(Boolean) as string) || "";
}

/** Para formatter */
function fmtMoney(n: number, locale: SupportedLocale, currency: string) {
  const loc = getDateLocale(locale);
  try {
    return new Intl.NumberFormat(loc, { style: "currency", currency }).format(Number(n) || 0);
  } catch {
    return `${(Number(n) || 0).toLocaleString(loc, { minimumFractionDigits: 2 })} ${currency}`;
  }
}

/** PDF için minimal populate */
function populateForPdf(q: any) {
  return q
    .populate(
      "company",
      "companyName email phone website images address bankDetails taxNumber handelsregisterNumber registerCourt"
    )
    .populate("customer", "companyName contactName email phone address")
    .populate("items.ensotekprod", "name price")
    .populate("items.sparepart", "name price");
}

/** İçerik değişirse PDF’i yenilemeli miyiz? */
function shouldRegeneratePdf(body: any) {
  const keys = [
    "items",
    "shippingCost",
    "additionalFees",
    "discount",
    "currency",
    "validUntil",
    "notes",
    "paymentTerms",
    "contactPerson",
  ];
  return keys.some((k) => Object.prototype.hasOwnProperty.call(body, k));
}

/** PDF üret → kayda yaz → revisionHistory push */
async function generateAndAttachPdf(
  OfferModel: any,
  offerId: any,
  locale: SupportedLocale,
  userId?: any
) {
  const offerDoc = await populateForPdf(OfferModel.findById(offerId));
  if (!offerDoc) return null;

  try {
    const pdfUrl = await generateOfferPdf(offerDoc, offerDoc.company, offerDoc.customer, locale); // always string
    if (!pdfUrl) throw new Error("generateOfferPdf returned empty url");

    offerDoc.pdfUrl = pdfUrl;
    offerDoc.revisionHistory = Array.isArray(offerDoc.revisionHistory) ? offerDoc.revisionHistory : [];
    offerDoc.revisionHistory.push({
      pdfUrl,
      updatedAt: new Date(),
      by: userId || null,
      note: "pdf.generated",
    });
    await offerDoc.save();
    return pdfUrl;
  } catch (e: any) {
    logger.error("[OFFER_PDF_GENERATE_ERROR]", { offerId, error: e?.message });
    return null;
  }
}

/** ✉️ Müşteriye e-posta gönder (şablonla) — başarı/başarısızlık döner */
async function emailOfferToCustomer(
  req: Request,
  offerId: any,
  locale: SupportedLocale,
  opts?: { trigger?: "create" | "statusSent" }
): Promise<boolean> {
  try {
    const { Offer } = await getTenantModels(req);
    const offerDoc: any = await populateForPdf(Offer.findById(offerId));
    if (!offerDoc) return false;

    const customerEmail: string | undefined = offerDoc?.customer?.email;
    if (!customerEmail) {
      logger.withReq.warn(req, "[OFFER_EMAIL_SKIP_NO_CUSTOMER_EMAIL]", { offerId });
      return false;
    }

    // PDF güvence: yoksa üret; yine yoksa mail gönderme
    let pdfUrl: string = offerDoc.pdfUrl || "";
    if (!pdfUrl) {
      const url = await generateAndAttachPdf(Offer, offerId, locale, (req as any).user?._id);
      pdfUrl = url || "";
    }
    if (!pdfUrl) {
      logger.withReq.error(req, "[OFFER_EMAIL_ABORT_NO_PDF]", { offerId });
      return false;
    }

    const { frontendUrl, brandName, senderEmail } = getTenantMailContext(req);
    const brand = brandName || "Our Company";
    const brandWebsite = frontendUrl || undefined;
    const viewUrl = frontendUrl ? `${frontendUrl.replace(/\/$/, "")}/offers/${offerDoc._id}` : "";

    // item satırları
    const currency = offerDoc.currency || "EUR";
    const rows = (offerDoc.items || []).map((it: any) => {
      const nameTL =
        it.ensotekprod?.name || it.sparepart?.name || it.productName || emptyTL(SUPPORTED_LOCALES);
      const displayName = resolveTL(nameTL, locale);
      const unit = typeof it.customPrice === "number" ? it.customPrice : it.unitPrice;
      return {
        name: displayName || "-",
        qty: Number(it.quantity) || 0,
        unitPrice: fmtMoney(unit, locale, currency),
        total: fmtMoney(it.total || 0, locale, currency),
      };
    });

    // toplamlar
    const subtotal = fmtMoney(offerDoc.totalNet || 0, locale, currency);
    const vat = fmtMoney(offerDoc.totalVat || 0, locale, currency);
    const shipping = offerDoc.shippingCost ? fmtMoney(offerDoc.shippingCost, locale, currency) : undefined;
    const fees = offerDoc.additionalFees ? fmtMoney(offerDoc.additionalFees, locale, currency) : undefined;
    const discount =
      offerDoc.discount && Number(offerDoc.discount) > 0
        ? `- ${fmtMoney(offerDoc.discount, locale, currency)}`
        : undefined;
    const grandTotal = fmtMoney(offerDoc.totalGross || 0, locale, currency);

    const validUntil =
      offerDoc.validUntil ? new Date(offerDoc.validUntil).toLocaleDateString(getDateLocale(locale)) : undefined;

    const helloName =
      offerDoc?.customer?.contactName ||
      resolveTL(offerDoc?.customer?.companyName, locale) ||
      undefined;

    const subject = offerEmailSubject(offerDoc.offerNumber, locale);
    const html = offerEmailTemplate({
      locale,
      offerNumber: offerDoc.offerNumber,
      name: helloName,
      rows,
      subtotal,
      vat,
      shipping,
      fees,
      discount,
      grandTotal,
      currency,
      validUntil,
      viewUrl,
      pdfUrl,
      brandName: brand,
      brandWebsite,
      senderEmail,
    }) as string;

    await sendEmail({
      tenantSlug: (req as any).tenant,
      to: customerEmail,
      subject,
      html,
      from: senderEmail,
    });

    // gönderim işaretleri
    offerDoc.sentByEmail = true;
    offerDoc.sentAt = new Date();
    offerDoc.email = offerDoc.email || {};
    offerDoc.email.lastEmailError = null;
    await offerDoc.save();

    logger.withReq.info(req, "[OFFER_EMAIL_SENT]", {
      offerId,
      to: customerEmail,
      trigger: opts?.trigger || "create",
    });

    return true;
  } catch (e: any) {
    logger.withReq.error(req, "[OFFER_EMAIL_SEND_ERROR]", { offerId, error: e?.message });
    try {
      const { Offer } = await getTenantModels(req);
      await Offer.findByIdAndUpdate(offerId, { $set: { "email.lastEmailError": e?.message || String(e) } });
    } catch {}
    return false;
  }
}

/** CREATE — e-mail gönderme! (yalnızca kaydet + mümkünse PDF üret) */
export async function createOffer(req: Request, res: Response) {
  const locale: SupportedLocale = (req as any).locale || getLogLocale();
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  try {
    const { Offer, Company, Customer, Ensotekprod, Sparepart } = await getTenantModels(req);
    const {
      company, customer, items, shippingCost = 0, additionalFees = 0, discount = 0,
      validUntil, notes, paymentTerms, currency = "EUR", source = "internal", rfqId,
      contactPerson, email, attachments,
    } = req.body;

    if (!company || !customer || !items?.length || !validUntil) {
      res.status(400).json({ success: false, message: t("errors.required_fields") });
      return;
    }

    const companyExists = await Company.findOne({ _id: company, tenant: req.tenant });
    if (!companyExists) { res.status(404).json({ success: false, message: t("errors.company_not_found") }); return; }
    const customerExists = await Customer.findOne({ _id: customer, tenant: req.tenant });
    if (!customerExists) { res.status(404).json({ success: false, message: t("errors.customer_not_found") }); return; }

    // Kalem zenginleştirme
    const enrichedItems = await Promise.all(
      (items as any[]).map(async (it) => {
        const type = String(it.productType || "").trim();
        let ensotekDoc: any = null, spareDoc: any = null, productName: any = null, basePrice = 0;

        if (type === "ensotekprod") {
          if (!it.ensotekprod) throw new Error(t("errors.no_product_reference"));
          ensotekDoc = await Ensotekprod.findOne({ _id: it.ensotekprod, tenant: req.tenant }).select("name price");
          if (!ensotekDoc) throw new Error(t("errors.ensotekprod_not_found", { id: it.ensotekprod }));
          productName = ensotekDoc.name; basePrice = Number(ensotekDoc.price || 0);
        } else if (type === "sparepart") {
          if (!it.sparepart) throw new Error(t("errors.no_product_reference"));
          spareDoc = await Sparepart.findOne({ _id: it.sparepart, tenant: req.tenant }).select("name price");
          if (!spareDoc) throw new Error(t("errors.sparepart_not_found"));
          productName = spareDoc.name; basePrice = Number(spareDoc.price || 0);
        } else {
          throw new Error(t("validation.invalidProductType"));
        }

        const unitPrice = typeof it.unitPrice === "number" ? it.unitPrice : basePrice;
        const customPrice = typeof it.customPrice === "number" ? it.customPrice : unitPrice;
        const quantity = Number(it.quantity) || 1;
        const vat = typeof it.vat === "number" ? it.vat : 19;

        return {
          productType: type,
          ensotekprod: ensotekDoc?._id,
          sparepart:   spareDoc?._id,
          productName: productName || emptyTL(SUPPORTED_LOCALES),
          quantity, unitPrice, customPrice, vat, total: 0,
        };
      })
    );

    const doc: any = new Offer({
      tenant: req.tenant,
      offerNumber: req.body.offerNumber || `OFR-${Date.now()}`,
      source, rfqId: rfqId || null,
      user: (req as any).user?._id || null,
      company, customer, contactPerson,
      items: enrichedItems,
      shippingCost, additionalFees, discount,
      currency, validUntil,
      notes: notes || emptyTL(SUPPORTED_LOCALES),
      paymentTerms: paymentTerms || emptyTL(SUPPORTED_LOCALES),
      status: "draft",
      totalNet: 0, totalVat: 0, totalGross: 0,
      sentByEmail: false, pdfUrl: "",
      createdBy: (req as any).user?._id || null,
      email: email || {}, attachments: attachments || [],
    });

    if (typeof doc.recalcTotals === "function") doc.recalcTotals();
    await doc.save();

    // Sadece PDF üretmeyi dene (başarısızlık akışı bozmasın)
    try {
      await generateAndAttachPdf(Offer, doc._id, locale, (req as any).user?._id);
    } catch (e: any) {
      logger.withReq.warn(req, "[OFFER_CREATE_PDF_WARN]", { offerId: doc._id, error: e?.message });
    }

    const finalDoc = await populateForPdf(Offer.findById(doc._id));
    logger.withReq.info(req, "[OFFER_CREATED]", { offerId: doc._id, company, customer });
    res.status(201).json({ success: true, message: t("success.created"), data: await finalDoc });
    return;
  } catch (err: any) {
    logger.withReq.error(req, "[OFFER_CREATE_ERROR]", { error: err?.message });
    res.status(500).json({ success: false, message: err.message || "Create failed" });
    return;
  }
}

/** STATUS — "sent" olduğunda e-maili burada gönder */
export async function updateOfferStatus(req: Request, res: Response) {
  const locale: SupportedLocale = (req as any).locale || getLogLocale();

  try {
    const { Offer } = await getTenantModels(req);
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "invalidOfferId" });
      return;
    }

    const { status, note } = req.body;
    const doc: any = await Offer.findOne({ _id: id, tenant: req.tenant });
    if (!doc) {
      res.status(404).json({ success: false, message: "offerNotFound" });
      return;
    }

    // "sent" → önce email (PDF yoksa üretir). Başarısızsa status değiştirme.
    if (status === "sent") {
      const sentOk = await emailOfferToCustomer(req, doc._id, locale, { trigger: "statusSent" });
      if (!sentOk) {
        res.status(500).json({ success: false, message: "Email/PDF failed; status not updated." });
        return;
      }
      doc.status = "sent";
      doc.statusHistory = doc.statusHistory || [];
      doc.statusHistory.push({ status: "sent", at: new Date(), by: (req as any).user?._id, note });
      await doc.save();

      res.status(200).json({ success: true, data: { id: doc._id, status: doc.status } });
      return;
    }

    // diğer statüler
    doc.status = status;
    doc.statusHistory = doc.statusHistory || [];
    doc.statusHistory.push({ status, at: new Date(), by: (req as any).user?._id, note });
    await doc.save();

    res.status(200).json({ success: true, data: { id: doc._id, status: doc.status } });
    return;
  } catch (err: any) {
    logger.withReq.error(req, "[OFFER_STATUS_UPDATE_ERROR]", { error: err?.message });
    res.status(500).json({ success: false, message: err.message || "Status update failed" });
    return;
  }
}

/** LIST */
export async function listOffers(req: Request, res: Response) {
  try {
    const { Offer } = await getTenantModels(req);
    const { page = 1, limit = 20, q, status, company, customer, user, sort = "-createdAt", from, to } =
      req.query as any;

    const filter: any = { tenant: req.tenant };
    if (status) filter.status = status;
    if (company && isValidObjectId(company)) filter.company = company;
    if (customer && isValidObjectId(customer)) filter.customer = customer;
    if (user && isValidObjectId(user)) filter.user = user;
    if (from || to) {
      filter.createdAt = {
        ...(from ? { $gte: new Date(from) } : {}),
        ...(to ? { $lte: new Date(to) } : {}),
      };
    }
    if (q) {
      filter.$or = [
        { offerNumber: new RegExp(q, "i") },
        { contactPerson: new RegExp(q, "i") },
        { "email.to": new RegExp(q, "i") },
      ];
    }

    const items = await Offer.find(filter)
      .sort(String(sort))
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .select("-acceptTokenHash")
      .populate("company", "companyName email")
      .populate("customer", "companyName contactName email");

    const total = await Offer.countDocuments(filter);
    res.status(200).json({ success: true, data: items, meta: { page: +page, limit: +limit, total } });
    return;
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || "List failed" });
    return;
  }
}

/** GET BY ID */
export async function getOffer(req: Request, res: Response) {
  try {
    const { Offer } = await getTenantModels(req);
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "invalidOfferId" });
      return;
    }
    const doc = await Offer.findOne({ _id: id, tenant: req.tenant })
      .select("-acceptTokenHash")
      .populate("user", "name email")
      .populate("company", "companyName email")
      .populate("customer", "companyName contactName email")
      .populate("items.ensotekprod", "name price")
      .populate("items.sparepart", "name price");

    if (!doc) {
      res.status(404).json({ success: false, message: "offerNotFound" });
      return;
    }
    res.status(200).json({ success: true, data: doc });
    return;
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || "Get failed" });
    return;
  }
}

/** UPDATE */
export async function updateOffer(req: Request, res: Response) {
  const locale: SupportedLocale = (req as any).locale || getLogLocale();
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  try {
    const { Offer, Ensotekprod, Sparepart } = await getTenantModels(req);
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "invalidOfferId" });
      return;
    }

    const doc: any = await Offer.findOne({ _id: id, tenant: req.tenant });
    if (!doc) {
      res.status(404).json({ success: false, message: t("errors.offer_not_found") });
      return;
    }

    const {
      items,
      shippingCost,
      additionalFees,
      discount,
      validUntil,
      notes,
      paymentTerms,
      currency,
      contactPerson,
      email,
      attachments,
      status,
    } = req.body;

    if (items?.length) {
      doc.items = await Promise.all(
        items.map(async (it: any) => {
          const type = String(it.productType || "").trim();
          let ensotekDoc: any = null,
            spareDoc: any = null,
            productName: any = null,
            basePrice = 0;

          if (type === "ensotekprod") {
            if (!it.ensotekprod) throw new Error(t("errors.no_product_reference"));
            ensotekDoc = await Ensotekprod.findOne({ _id: it.ensotekprod, tenant: req.tenant }).select("name price");
            if (!ensotekDoc) throw new Error(t("errors.ensotekprod_not_found", { id: it.ensotekprod }));
            productName = ensotekDoc.name; basePrice = Number(ensotekDoc.price || 0);
          } else if (type === "sparepart") {
            if (!it.sparepart) throw new Error(t("errors.no_product_reference"));
            spareDoc = await Sparepart.findOne({ _id: it.sparepart, tenant: req.tenant }).select("name price");
            if (!spareDoc) throw new Error(t("errors.sparepart_not_found"));
            productName = spareDoc.name; basePrice = Number(spareDoc.price || 0);
          } else {
            throw new Error(t("validation.invalidProductType"));
          }

          const unitPrice =
            typeof it.unitPrice === "number" ? it.unitPrice : basePrice;
          const customPrice = typeof it.customPrice === "number" ? it.customPrice : unitPrice;
          const quantity = Number(it.quantity) || 1;
          const vat = typeof it.vat === "number" ? it.vat : 19;

          return {
            productType: type,
            ensotekprod: ensotekDoc?._id,
            sparepart:   spareDoc?._id,
            productName: productName || it.productName || emptyTL(SUPPORTED_LOCALES),
            quantity,
            unitPrice,
            customPrice,
            vat,
            total: 0,
          };
        })
      );
    }

    if (shippingCost !== undefined) doc.shippingCost = Number(shippingCost);
    if (additionalFees !== undefined) doc.additionalFees = Number(additionalFees);
    if (discount !== undefined) doc.discount = Number(discount);
    if (validUntil) doc.validUntil = new Date(validUntil);
    if (currency) doc.currency = currency;
    if (contactPerson !== undefined) doc.contactPerson = contactPerson;
    if (email !== undefined) doc.email = email;
    if (attachments !== undefined) doc.attachments = attachments;
    if (notes) doc.notes = notes;
    if (paymentTerms) doc.paymentTerms = paymentTerms;
    if (status) doc.status = status;

    if (typeof doc.recalcTotals === "function") doc.recalcTotals();
    await doc.save();

    if (shouldRegeneratePdf(req.body)) {
      await generateAndAttachPdf(Offer, doc._id, locale, (req as any).user?._id);
    }

    const finalDoc = await populateForPdf(Offer.findById(doc._id));
    logger.withReq.info(req, "[OFFER_UPDATED]", { offerId: doc._id });
    res.status(200).json({ success: true, message: t("success.updated"), data: await finalDoc });
    return;
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || "Update failed" });
    return;
  }
}

/** DELETE */
export async function deleteOffer(req: Request, res: Response) {
  try {
    const { Offer } = await getTenantModels(req);
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "invalidOfferId" });
      return;
    }
    const del = await Offer.findOneAndDelete({ _id: id, tenant: req.tenant });
    if (!del) {
      res.status(404).json({ success: false, message: "offerNotFound" });
      return;
    }
    res.status(200).json({ success: true, message: "deleted" });
    return;
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || "Delete failed" });
    return;
  }
}
