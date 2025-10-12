import { Request, Response } from "express";
import { Types, Model } from "mongoose"; // ⬅️ Types eklendi
import asyncHandler from "express-async-handler";
import logger from "@/core/middleware/logger/logger";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { t as translate } from "@/core/utils/i18n/translate";
import orderTranslations from "./i18n";
import type { SupportedLocale } from "@/types/common";
import type { IOrderItem, IShippingAddress, PaymentMethod, ServiceType } from "@/modules/orders/types";
import { computePricing } from "@/modules/pricing/service";
import { coalesceStreetLike, numOr0, priceMenuLine } from "./utils/order.helpers";
import { sendOrderEmails } from "./utils/order.emails";

/* ------------------------------------------------
 * Product type union (controller içi)
 * ------------------------------------------------ */
type ProductType = "product" | "ensotekprod" | "sparepart" | "menuitem";

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const models = await getTenantModels(req);
  const {
    Order,
    Address,
    Coupon,
    Payment,
    Product,
    Ensotekprod,
    Sparepart,
    MenuItem,
    PriceListItem,
    Branch,
    ShippingMethod,
    FeeRule,
    Notification,
  } = models;

  const locale: SupportedLocale = (req as any).locale || getLogLocale();
  const t = (k: string, p?: any) => translate(k, locale, orderTranslations, p);

  const {
    items,
    addressId,
    shippingAddress,
    paymentMethod,
    couponCode,
    serviceType = "delivery",
    branch,
    tableNo,
    currency: bodyCurrency = "TRY",
  } = req.body;

  const shippingMethodCode = String(req.body?.shippingMethodCode || "standard");
  const feeFlags = (Array.isArray(req.body?.feeFlags) ? req.body.feeFlags : undefined) as
    | Array<"cod" | "express_shipping" | "below_free_shipping" | "all">
    | undefined;

  const currency = String(bodyCurrency || "TRY").toUpperCase();
  const userId = req.user?._id;
  const userName = req.user?.name || "";
  const userEmail = req.user?.email || "";

  // Idempotency (header: Idempotency-Key)
  const idempotencyKey = String(req.header("Idempotency-Key") || "").trim();
  if (idempotencyKey) {
    const existing = await Order.findOne({ tenant: req.tenant, idempotencyKey }).lean();
    if (existing) {
      res.status(200).json({ success: true, message: t("order.created.success"), data: existing });
      return;
    }
  }

  /* --- Branch / servis tipi --- */
  let branchDoc: any = null;
  const st: ServiceType = serviceType;
  if (branch) {
    branchDoc = await Branch.findOne({ _id: branch, tenant: req.tenant }).lean();
    if (!branchDoc) {
      res.status(400).json({ success: false, message: t("error.branchNotFound") });
      return;
    }
    if (st && Array.isArray(branchDoc.services) && !branchDoc.services.includes(st)) {
      res.status(400).json({ success: false, message: t("error.branchServiceNotAvailable") });
      return;
    }
  }

  /* --- Adres (delivery zorunlu) --- */
  let shippingAddressWithTenant: IShippingAddress | undefined;
  if (st === "delivery") {
    const saBody = (shippingAddress || {}) as Partial<IShippingAddress> & {
      addressLine?: string;
      houseNumber?: string;
      email?: string;
      addressType?: string;
    };

    if (addressId) {
      const addressDoc = await Address.findOne({ _id: addressId, tenant: req.tenant }).lean<any>();
      if (!addressDoc) {
        res.status(400).json({ success: false, message: t("error.addressNotFound") });
        return;
      }
      const streetNorm = coalesceStreetLike(addressDoc) || coalesceStreetLike(saBody);
      const cityNorm = (addressDoc.city || saBody.city || "").trim();
      const postalNorm = (addressDoc.postalCode || saBody.postalCode || "").trim();
      const countryNorm = (addressDoc.country || saBody.country || "TR").trim();
      const phoneNorm = (addressDoc.phone || saBody.phone || "").trim();

      if (!streetNorm || !cityNorm || !postalNorm || !countryNorm || !phoneNorm) {
        res.status(400).json({ success: false, message: t("error.shippingAddressRequired") });
        return;
      }

      shippingAddressWithTenant = {
        name: userName,
        tenant: req.tenant,
        phone: phoneNorm,
        street: streetNorm,
        city: cityNorm,
        postalCode: postalNorm,
        country: countryNorm,
        ...(addressDoc.addressLine ? { addressLine: addressDoc.addressLine } : {}),
        ...(addressDoc.houseNumber ? { houseNumber: addressDoc.houseNumber } : {}),
      };
    } else {
      const streetNorm = coalesceStreetLike(saBody);
      const ok = saBody?.name && saBody?.phone && streetNorm && saBody?.city && saBody?.postalCode && saBody?.country;
      if (!ok) {
        res.status(400).json({ success: false, message: t("error.shippingAddressRequired") });
        return;
      }
      shippingAddressWithTenant = {
        name: String(saBody.name),
        tenant: req.tenant,
        phone: String(saBody.phone),
        street: streetNorm,
        city: String(saBody.city),
        postalCode: String(saBody.postalCode),
        country: String(saBody.country),
        ...(saBody.addressLine ? { addressLine: saBody.addressLine } : {}),
        ...(saBody.houseNumber ? { houseNumber: saBody.houseNumber } : {}),
      };
    }
  }

  if (!userEmail) {
    res.status(400).json({ success: false, message: t("error.userEmailRequired") });
    return;
  }

  /* --- Model map --- */
  const ProductModelProduct = (Product || Ensotekprod) as Model<any>;
  const EnsotekprodModel = (Ensotekprod || Product) as Model<any>;
  const modelMap: Record<ProductType, Model<any>> = {
    product: ProductModelProduct,
    ensotekprod: EnsotekprodModel,
    sparepart: Sparepart as Model<any>,
    menuitem: MenuItem as Model<any>,
  };

  let subtotal = 0;
  const enrichedItems: IOrderItem[] = [];
  const itemsForMail: string[] = [];

  for (const raw of items as any[]) {
    const ptype = String(raw.productType || "").toLowerCase() as ProductType;
    const ProductModel = modelMap[ptype];

    if (!ProductModel) {
      res.status(400).json({ success: false, message: `Model not supported: ${raw.productType}` });
      return;
    }

    if (ptype === "menuitem") {
      const menuItemDoc = await ProductModel.findOne({ _id: raw.product, tenant: req.tenant }).lean();
      if (!menuItemDoc) {
        res.status(404).json({ success: false, message: t("error.productNotFound") });
        return;
      }

      const menuSel = (raw.menu || {}) as {
        variantCode?: string;
        modifiers?: Array<{ groupCode: string; optionCode: string; quantity?: number }>;
        depositIncluded?: boolean;
        notes?: string;
      };

      const priced = await priceMenuLine(
        MenuItem,
        PriceListItem,
        String(raw.product),
        req.tenant,
        menuSel.variantCode,
        menuSel.modifiers || [],
        menuSel.depositIncluded ?? true,
        currency
      );
      if ("error" in priced) {
        res.status(400).json({ success: false, message: t(priced.error) });
        return;
      }

      const qty = Math.max(1, Number(raw.quantity || 1));
      const lineTotal = priced.unitPrice * qty;
      subtotal += lineTotal;

      enrichedItems.push({
        // ⬇️ her zaman ObjectId'a çevir
        product: new Types.ObjectId(String(raw.product)),
        productType: ptype as IOrderItem["productType"], // ⬅️ literal yerine ptype
        quantity: qty,
        tenant: req.tenant,
        unitPrice: priced.unitPrice,
        unitCurrency: (priced.unitCurrency || currency).toUpperCase(),
        priceAtAddition: priced.unitPrice,
        totalPriceAtAddition: lineTotal,
        menu: {
          variantCode: menuSel.variantCode ?? priced.selectedVariantCode,
          modifiers: menuSel.modifiers,
          notes: menuSel.notes,
          depositIncluded: menuSel.depositIncluded ?? true,
          snapshot: priced.snapshot,
        },
        priceComponents: priced.priceComponents,
      } as IOrderItem);

      const displayName =
        (priced.snapshot?.name as any)?.[locale] || (priced.snapshot?.name as any)?.en || "Item";
      const variantName =
        (priced.snapshot?.variantName as any)?.[locale] || (priced.snapshot?.variantName as any)?.en || "";
      itemsForMail.push(`• ${displayName}${variantName ? ` (${variantName})` : ""} x ${qty}`);
      continue;
    }

    // --- Basit ürünler (product/ensotekprod/sparepart)
    const productDoc = await ProductModel
      .findOne({ _id: raw.product, tenant: req.tenant })
      .lean<{ _id: any; name?: any; price?: number; stock?: number }>();
    if (!productDoc) {
      res.status(404).json({ success: false, message: t("error.productNotFound") });
      return;
    }
    if (typeof productDoc.stock === "number" && productDoc.stock < Number(raw.quantity || 1)) {
      res.status(400).json({ success: false, message: t("error.insufficientStock") });
      return;
    }

    const qty = Math.max(1, Number(raw.quantity || 1));
    const unitPrice = numOr0(raw.unitPrice ?? productDoc.price);
    const lineTotal = unitPrice * qty;
    subtotal += lineTotal;

    enrichedItems.push({
      // ⬇️ yine ObjectId'a çevir
      product: new Types.ObjectId(String(raw.product)),
      productType: ptype as IOrderItem["productType"],
      quantity: qty,
      tenant: req.tenant,
      unitPrice,
      unitCurrency: currency,
      priceAtAddition: unitPrice,
      totalPriceAtAddition: lineTotal,
    } as IOrderItem);

    const n = productDoc.name as any;
    itemsForMail.push(`• ${n?.[locale] || n?.en || String(productDoc._id)} – Qty: ${qty}`);
  }

  // --- Pricing (server-authoritative)
  let pricing: any = null;
  let couponDoc: any = null;

  try {
    if (couponCode) {
      couponDoc = await Coupon.findOne({
        code: String(couponCode).trim().toUpperCase(),
        isActive: true,
        tenant: req.tenant,
      }).lean();
    }

    pricing = await computePricing(
      { ShippingMethod, FeeRule, Coupon },
      {
        tenant: req.tenant,
        currency,
        locale,
        shippingMethodCode,
        shippingAddress: {
          country: shippingAddressWithTenant?.country,
          state: undefined,
          city: shippingAddressWithTenant?.city,
          postal: shippingAddressWithTenant?.postalCode,
        },
        couponCode: couponCode ? String(couponCode).trim().toUpperCase() : undefined,
        feeFlags,
        items: enrichedItems.map((i) => ({
          productId: String(i.product),
          variantId: i.menu?.variantCode,
          title: (i as any).menu?.snapshot?.name?.[locale],
          image: (i as any).menu?.snapshot?.image,
          qty: i.quantity,
          price_cents: Math.round((i.unitPrice || 0) * 100),
          currency,
        })),
      }
    );
  } catch (e) {
    logger.withReq.warn(req, "Pricing failed, falling back to FE totals", { error: (e as Error)?.message });
  }

  // Pricing başarılıysa onun sonuçlarını kullan
  const subtotalMajor = pricing ? (pricing.subtotal_cents || 0) / 100 : subtotal;
  const shippingMajor = pricing ? (pricing.shipping?.price_cents || 0) / 100 : 0;
  const taxMajor = pricing ? (pricing.tax_cents || 0) / 100 : 0;
  const discountMajor =
    pricing ? (pricing.discount_cents || 0) / 100 : (couponDoc ? Math.round(subtotal * (numOr0(couponDoc.discount) / 100)) : 0);
  const feesMajor = pricing ? (pricing.fees || []).reduce((s: number, f: any) => s + (f.amount_cents || 0), 0) / 100 : 0;

  const finalTotalMajor = pricing
    ? (pricing.total_cents || 0) / 100
    : Math.max(0, subtotalMajor + shippingMajor + feesMajor + taxMajor - discountMajor);

  /* --- Ödeme yöntemi --- */
  const method: PaymentMethod = (paymentMethod as PaymentMethod) || "cash_on_delivery";
  if (!["cash_on_delivery", "credit_card", "paypal"].includes(method)) {
    res.status(400).json({ success: false, message: t("error.invalidPaymentMethod") });
    return;
  }

  /* --- Kayıt --- */
  const order = await Order.create({
    user: userId,
    tenant: req.tenant,
    idempotencyKey: idempotencyKey || undefined,

    serviceType: st,
    branch: branch || undefined,
    tableNo: st === "dinein" ? tableNo || undefined : undefined,

    addressId: st === "delivery" ? addressId || undefined : undefined,
    shippingAddress: st === "delivery" ? (shippingAddressWithTenant as any) : undefined,

    items: enrichedItems,

    currency,
    subtotal: subtotalMajor,
    deliveryFee: shippingMajor,
    tipAmount: 0,
    serviceFee: feesMajor,
    taxTotal: taxMajor,
    discount: discountMajor,
    finalTotal: finalTotalMajor,

    // cents (Pricing ile tam uyum)
    subtotal_cents: pricing?.subtotal_cents ?? Math.round(subtotalMajor * 100),
    deliveryFee_cents: pricing?.shipping?.price_cents ?? Math.round(shippingMajor * 100),
    tip_cents: 0,
    serviceFee_cents: pricing
      ? (pricing.fees || []).reduce((s: number, f: any) => s + (f.amount_cents || 0), 0)
      : Math.round(feesMajor * 100),
    tax_cents: pricing?.tax_cents ?? Math.round(taxMajor * 100),
    discount_cents: pricing?.discount_cents ?? Math.round(discountMajor * 100),
    finalTotal_cents: pricing?.total_cents ?? Math.round(finalTotalMajor * 100),

    coupon: couponDoc?._id,
    couponSnapshot:
      pricing?.snapshots?.coupon ||
      (couponDoc ? { code: couponDoc.code, type: "percent", value: couponDoc.discount } : undefined),
    shippingSnapshot: pricing
      ? {
        code: pricing.snapshots?.shippingMethod?.code,
        calc: pricing.snapshots?.shippingMethod?.calc,
        price_cents: pricing.shipping?.price_cents || 0,
      }
      : undefined,

    paymentMethod: method,
    paymentStatus: method === "cash_on_delivery" ? "processing" : "requires_payment",
    status: "pending",
    isDelivered: false,
    isPaid: false,
    language: locale,

    timeline: [{ at: new Date(), ev: "ORDER_CREATED", by: String(userId), meta: { pricing: pricing?.snapshots } }],
  });

  /* --- Ödeme kaydı (kart/paypal) --- */
  let paymentDoc: any = null;
  if (method === "credit_card" || method === "paypal") {
    const paymentMethodMap = { credit_card: "card", paypal: "wallet", cash_on_delivery: "cash" } as const;
    try {
      paymentDoc = await models.Payment.create({
        tenant: req.tenant,
        kind: "payment",
        status: "pending",
        method: paymentMethodMap[method],
        provider: method === "paypal" ? "paypal" : undefined,
        grossAmount: finalTotalMajor,
        currency,
        receivedAt: new Date(),
        payer: { name: userName || undefined, email: userEmail || undefined },
        metadata: { channel: "menu_order", orderId: String(order._id) },
      });

      order.payments = [...(order.payments || []), paymentDoc._id];
      await order.save();
    } catch (e) {
      logger.withReq.error(req, "Payment create failed", { error: (e as Error)?.message });
    }
  }

  /* --- Notification (kullanıcıya) --- */
  try {
    if (Notification && req.user?._id) {
      await Notification.create({
        user: req.user._id,
        tenant: req.tenant,
        type: "success",
        message: t("order.created.success"),
        data: { orderId: order._id, total: finalTotalMajor, currency },
        language: locale,
      });
    }
  } catch (e) {
    logger.withReq.warn(req, "User notification create failed", { error: (e as Error)?.message });
  }

  // --- Email (müşteri & admin)
  await sendOrderEmails({
    req,
    order,
    itemsForMail,
    currency,
    locale,
    userName,
    userEmail,
    discountMajor,
    finalTotalMajor,
    couponDoc,
  });

  logger.withReq.info(req, t("order.created.success") + ` | Order: ${order._id}`);
  res.status(201).json({
    success: true,
    message: t("order.created.success"),
    data: {
      ...order.toObject(),
      payment: paymentDoc ? paymentDoc.toObject() : undefined,
    },
  });
  return;
});
