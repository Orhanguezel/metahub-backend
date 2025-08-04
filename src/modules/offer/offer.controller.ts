import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { t as translate } from "@/core/utils/i18n/translate";
import type { SupportedLocale } from "@/types/common";
import translations from "./i18n";
import { v4 as uuidv4 } from "uuid";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { generateOfferPdf } from "@/core/pdf/generateOfferPdf";
import { Types } from "mongoose";
import logger from "@/core/middleware/logger/logger";

// --- Teklif kalemlerini enrich et ---
const enrichOfferItems = async (
  items: any[],
  { Product, Ensotekprod },
  tenant: string,
  locale: SupportedLocale,
  t: any
) => {
  let totalNet = 0;
  const enrichedItems = await Promise.all(
    items.map(async (item) => {
      let productDoc = null;
      let ensotekprodDoc = null;
      let productName;

      if (item.product) {
        productDoc = await Product.findOne({ _id: item.product, tenant });
        if (!productDoc) throw new Error(t("errors.product_not_found", { id: item.product }));
        productName = productDoc.name;
      }
      if (item.ensotekprod) {
        ensotekprodDoc = await Ensotekprod.findOne({ _id: item.ensotekprod, tenant });
        if (!ensotekprodDoc) throw new Error(t("errors.ensotekprod_not_found", { id: item.ensotekprod }));
        productName = ensotekprodDoc.name;
      }
      if (!productDoc && !ensotekprodDoc) {
        throw new Error(t("errors.no_product_reference"));
      }
      const unitPrice = typeof item.unitPrice === "number"
        ? item.unitPrice
        : productDoc
        ? productDoc.price
        : ensotekprodDoc.price;
      const customPrice = typeof item.customPrice === "number" ? item.customPrice : unitPrice;
      const quantity = Number(item.quantity) || 1;
      const vat = typeof item.vat === "number" ? item.vat : 19;
      const total = customPrice * quantity;

      totalNet += total;

      return {
        product: productDoc?._id,
        ensotekprod: ensotekprodDoc?._id,
        productName,
        quantity,
        unitPrice,
        customPrice,
        vat,
        total,
      };
    })
  );
  return { enrichedItems, totalNet };
};

// --- Offer CREATE + PDF ---
export const createOffer = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { Offer, Product, Ensotekprod, Company, Customer } = await getTenantModels(req);

  try {
    const {
      company,
      customer,
      items,
      shippingCost = 0,
      additionalFees = 0,
      discount = 0,
      validUntil,
      notes,
      paymentTerms,
      currency = "EUR",
    } = req.body;

    // --- Zorunlu alan kontrolü ---
    if (!company || !customer || !items?.length || !validUntil) {
      res.status(400).json({ success: false, message: t("errors.required_fields") });
      return;
    }

    // --- Company & Customer doğrula ---
    const companyExists = await Company.findOne({ _id: company, tenant: req.tenant });
    if (!companyExists) {
      res.status(404).json({ success: false, message: t("errors.company_not_found") });
      return;
    }
    const customerExists = await Customer.findOne({ _id: customer, tenant: req.tenant });
    if (!customerExists) {
      res.status(404).json({ success: false, message: t("errors.customer_not_found") });
      return;
    }

    // --- Kalemleri enrich et ---
    const { enrichedItems, totalNet } = await enrichOfferItems(items, { Product, Ensotekprod }, req.tenant, locale, t);
    const totalVat = enrichedItems.reduce((sum, i) => sum + ((i.total * i.vat) / 100), 0);
    const gross = totalNet + totalVat + Number(shippingCost) + Number(additionalFees) - Number(discount);

    // --- Teklif oluştur ---
    let offer = await Offer.create({
      offerNumber: `OFR-${uuidv4().slice(0, 8)}`,
      user: req.user?._id,
      company,  // <-- Null değil, id olarak atanıyor
      tenant: req.tenant,
      customer,
      items: enrichedItems,
      shippingCost,
      additionalFees,
      discount,
      currency,
      validUntil,
      notes,
      paymentTerms,
      status: "draft",
      totalNet,
      totalVat,
      totalGross: gross,
      sentByEmail: false,
      pdfUrl: "",
      createdBy: req.user?._id,
    });

    logger.withReq.info(req, t("logs.offer.created"), {
      offerId: offer._id,
      companyId: company,
      customerId: customer,
    });

    // --- PDF Generation & RevisionHistory ---
    try {
      const populatedOffer = await Offer.findById(offer._id)
        .populate("company", "companyName email")
        .populate("customer", "companyName contactName email")
        .populate("items.product", "name price")
        .populate("items.ensotekprod", "name price");

      const pdfUrl = await generateOfferPdf(
        populatedOffer,
        populatedOffer.company,
        populatedOffer.customer,
        locale
      );

      offer.pdfUrl = pdfUrl;
      offer.revisionHistory = [
        ...(offer.revisionHistory || []),
        {
          pdfUrl,
          updatedAt: new Date(),
          by: new Types.ObjectId(req.user?._id),
          note: t("pdf.generated", { locale }),
        },
      ];
      await offer.save();
    } catch (pdfError) {
      logger.withReq.error(req, "Offer PDF oluşturulamadı", {
        offerId: offer._id,
        error: pdfError?.message,
      });
    }

    // --- Final: Populated teklif dön (her iki ilişki dolu) ---
    const finalOffer = await Offer.findById(offer._id)
      .populate("company", "companyName email")
      .populate("customer", "companyName contactName email")
      .populate("items.product", "name price")
      .populate("items.ensotekprod", "name price");

    res.status(201).json({
      success: true,
      message: t("success.created"),
      offer: finalOffer,
    });
    return;
  } catch (error) {
    logger.withReq.error(req, "Offer create error", { error });
    next(error);
  }
});


// ✅ Tüm teklifleri getir
export const getOffers = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { Offer } = await getTenantModels(req);
    const offers = await Offer.find({ tenant: req.tenant })
      .populate("user", "name email")
      .populate("company", "companyName email")
      .populate("customer", "companyName contactName email")
      .populate("items.product", "name price")
      .populate("items.ensotekprod", "name price");
    res.status(200).json({
      success: true,
      data: offers,
    });
    return;
  } catch (error) {
    next(error);
  }
});

// ✅ Belirli bir teklifi getir
export const getOfferById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { Offer } = await getTenantModels(req);
    const offer = await Offer.findOne({ _id: req.params.id, tenant: req.tenant })
      .populate("user", "name email")
      .populate("company", "companyName email")
      .populate("customer", "companyName contactName email")
      .populate("items.product", "name price")
      .populate("items.ensotekprod", "name price");
    if (!offer) {
      res.status(404).json({ success: false, message: "Offer not found." });
      return;
    }
    res.status(200).json({
      success: true,
      data: offer,
    });
    return;
  } catch (error) {
    next(error);
  }
});

// ✅ Teklifi güncelle
export const updateOffer = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  try {
    const { Offer, Product, Ensotekprod } = await getTenantModels(req);
    const {
      items,
      shippingCost = 0,
      additionalFees = 0,
      discount = 0,
      validUntil,
      notes,
      paymentTerms,
      currency,
      status,
      pdfUrl,
      sentByEmail,
    } = req.body;

    if (!items?.length || !validUntil) {
      res.status(400).json({ success: false, message: t("errors.required_fields") });
      return;
    }

    const { enrichedItems, totalNet } = await enrichOfferItems(items, { Product, Ensotekprod }, req.tenant, locale, t);
    const totalVat = enrichedItems.reduce((sum, i) => sum + ((i.total * i.vat) / 100), 0);
    const gross = totalNet + totalVat + Number(shippingCost) + Number(additionalFees) - Number(discount);

    const offer = await Offer.findByIdAndUpdate(
      req.params.id,
      {
        items: enrichedItems,
        shippingCost,
        additionalFees,
        discount,
        validUntil,
        notes,
        paymentTerms,
        currency,
        status,
        pdfUrl,
        sentByEmail,
        totalNet,
        totalVat,
        totalGross: gross,
      },
      { new: true }
    );

    if (!offer) {
      res.status(404).json({ success: false, message: t("errors.offer_not_found") });
      return;
    }

    logger.withReq.info(req, t("logs.offer.updated"), {
      offerId: offer._id,
    });

    res.status(200).json({
      success: true,
      message: t("success.updated"),
      data: offer,
    });
    return;
  } catch (error) {
    next(error);
  }
});

// ✅ Teklif durumunu güncelle
export const updateOfferStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  try {
    const { Offer } = await getTenantModels(req);
    const { status } = req.body;

    const offer = await Offer.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!offer) {
      res.status(404).json({ success: false, message: t("errors.offer_not_found") });
      return;
    }

    logger.withReq.info(req, t("logs.offer.statusUpdated", { status }), {
      offerId: offer._id,
      status,
    });

    res.status(200).json({
      success: true,
      message: t("success.status_updated", { status }),
      data: offer,
    });
    return;
  } catch (error) {
    next(error);
  }
});

// ✅ Teklifi sil
export const deleteOffer = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  try {
    const { Offer } = await getTenantModels(req);
    const offer = await Offer.findByIdAndDelete(req.params.id);

    if (!offer) {
      res.status(404).json({ success: false, message: t("errors.offer_not_found") });
      return;
    }

    logger.withReq.info(req, t("logs.offer.deleted"), {
      offerId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message: t("success.deleted"),
    });
    return;
  } catch (error) {
    next(error);
  }
});

// ✅ Manuel PDF oluştur (opsiyonel endpoint)
export const generateOfferPdfAndLink = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  const { Offer, Company, Customer } = await getTenantModels(req);

  try {
    const offer = await Offer.findOne({ _id: req.params.id, tenant: req.tenant })
      .populate("company")
      .populate("customer");

    if (!offer) {
      res.status(404).json({ success: false, message: t("errors.offer_not_found") });
      return;
    }

    const pdfUrl = await generateOfferPdf(offer, offer.company, offer.customer, locale);

    offer.pdfUrl = pdfUrl;
    offer.revisionHistory = [
      ...(offer.revisionHistory || []),
      {
        pdfUrl,
        updatedAt: new Date(),
        by: new Types.ObjectId(req.user?._id),
        note: t("pdf.generated", { locale }),
      },
    ];
    await offer.save();

    logger.withReq.info(req, t("logs.offer.pdfGenerated"), {
      offerId: offer._id,
      pdfUrl,
    });

    res.status(200).json({
      success: true,
      pdfUrl,
      message: t("pdf.generated_success"),
      offerId: offer._id,
    });
    return;
  } catch (error) {
    next(error);
  }
});


// offer.controller.ts

export const requestOfferHandler = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  const { Customer, Offer, Product, Ensotekprod, Bike, Sparepart, Company } = await getTenantModels(req);

  try {
    // 1️⃣ Request'ten alanları çek
    const {
      name,
      email,
      company,
      phone,
      message,
      productId,
      productType // ensotekprod | bikes | sparepart | product
    } = req.body;

    // --- Validation (minimum alanlar) ---
    if (!name || !email || !company || !phone || !productId || !productType) {
      res.status(400).json({ success: false, message: t("errors.required_fields") });
      return;
    }

    // 2️⃣ Customer (Pasif) kaydı aç veya varsa referans al
    let customer = await Customer.findOne({ email, tenant: req.tenant });
    if (!customer) {
      customer = await Customer.create({
        tenant: req.tenant,
        companyName: company,
        contactName: name,
        email,
        phone,
        isActive: false,   // <-- Public kayıttan geldi, admin onayına kadar pasif!
        notes: "Public teklif isteği ile otomatik oluşturuldu."
        // Adres bilgisi istersen, burada ekle
      });
    }

    // 3️⃣ Product lookup (hangi koleksiyon ise oradan çek)
    let productDoc = null;
    let itemObj: any = {};

    if (productType === "ensotekprod") {
      productDoc = await Ensotekprod.findOne({ _id: productId, tenant: req.tenant });
      if (!productDoc) throw new Error(t("errors.ensotekprod_not_found", { id: productId }));
      itemObj.ensotekprod = productDoc._id;
      itemObj.productName = productDoc.name;
    } else if (productType === "bikes") {
      productDoc = await Bike.findOne({ _id: productId, tenant: req.tenant });
      if (!productDoc) throw new Error(t("errors.bike_not_found", { id: productId }));
      itemObj.product = productDoc._id;
      itemObj.productName = productDoc.name;
    } else if (productType === "sparepart") {
      productDoc = await Sparepart.findOne({ _id: productId, tenant: req.tenant });
      if (!productDoc) throw new Error(t("errors.sparepart_not_found", { id: productId }));
      itemObj.product = productDoc._id;
      itemObj.productName = productDoc.name;
    } else {
      // product (standart ürün)
      productDoc = await Product.findOne({ _id: productId, tenant: req.tenant });
      if (!productDoc) throw new Error(t("errors.product_not_found", { id: productId }));
      itemObj.product = productDoc._id;
      itemObj.productName = productDoc.name;
    }

    // 4️⃣ Teklif kalemi oluştur
    itemObj.quantity = 1;
    itemObj.unitPrice = productDoc?.price || 0;
    itemObj.customPrice = productDoc?.price || 0;
    itemObj.vat = 19;
    itemObj.total = productDoc?.price || 0;

    // 5️⃣ Şirket opsiyonel olabilir (tenant/company mapping, istersen burada çek)
    // let companyDoc = await Company.findOne({ tenant: req.tenant });

    // 6️⃣ Teklif oluştur (statü = draft, admin gözünde onaylanacak)
    const offer = await Offer.create({
      offerNumber: `OFR-${uuidv4().slice(0, 8)}`,
      tenant: req.tenant,
      user: null, // Public request! (istersen otomatik user veya null bırak)
      company: null, // İstersen varsayılan tenant şirketini set et
      customer: customer._id,
      items: [itemObj],
      shippingCost: 0,
      additionalFees: 0,
      discount: 0,
      currency: "EUR",
      validUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14), // 14 gün default
      notes: { tr: message || "", en: message || "", de: message || "" },
      paymentTerms: { tr: "", en: "", de: "" },
      status: "draft",
      totalNet: itemObj.total,
      totalVat: (itemObj.total * itemObj.vat) / 100,
      totalGross: itemObj.total + (itemObj.total * itemObj.vat) / 100,
      sentByEmail: false,
      pdfUrl: "",
      createdBy: null,
    });

    logger.withReq.info(req, "[PUBLIC OFFER REQUEST]", {
      customerId: customer._id,
      offerId: offer._id,
      productType,
      productId,
    });

    res.status(201).json({
      success: true,
      message: t("success.requested"),
      offerId: offer._id,
    });
    return;
  } catch (error) {
    logger.withReq.error(req, "[PUBLIC OFFER REQUEST ERROR]", { error });
    res.status(500).json({ success: false, message: error?.message || "Internal server error" });
    return;
  }
});

