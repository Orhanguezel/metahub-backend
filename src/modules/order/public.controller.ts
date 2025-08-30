import { Request, Response } from "express";
import type { Model, Types } from "mongoose";
import asyncHandler from "express-async-handler";
import { sendEmail } from "@/services/emailService";
import { orderConfirmationTemplate } from "@/modules/order/templates/orderConfirmation";
import type { SupportedLocale } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import orderTranslations from "./i18n";
import logger from "@/core/middleware/logger/logger";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { IOrderItem, IShippingAddress, PaymentMethod, ServiceType } from "@/modules/order/types";

import type {
  IMenuItem,
  IMenuItemModifierGroup,
  IMenuItemVariant,
  TranslatedLabel as TLabel,
  ItemPrice,
  PriceKind,
} from "@/modules/menuitem/types";

import type { IPriceListItem as UPriceListItem } from "@/modules/pricelist/types";
import translations from "./i18n";

/* ------------------------------------------------
 * Helpers
 * ------------------------------------------------ */

const norm = (s?: string) => String(s || "").trim().toLowerCase();

const isPosNum = (v: any) => typeof v === "number" && isFinite(v) && v > 0;
const numOr0 = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const pickFirstNumber = (...vals: any[]) => {
  for (const v of vals) {
    const n = numOr0(v);
    if (n > 0) return n;
  }
  return 0;
};

function coalesceStreetLike(a?: { street?: string; addressLine?: string; houseNumber?: string }) {
  const street = (a?.street || "").trim();
  if (street) return street;
  const line = (a?.addressLine || "").trim();
  const hn = (a?.houseNumber || "").trim();
  return [line, hn].filter(Boolean).join(" ").trim();
}

/** Gömülü prices[] içinden uygun tutarı seç. Varsayılan: 'surcharge' (modifier için). */
const pickEmbeddedPriceAmount = (
  prices?: ItemPrice[],
  kind: PriceKind = "surcharge"
): number => {
  if (!Array.isArray(prices) || prices.length === 0) return 0;
  const now = new Date();

  const candidates = prices.filter((p) => {
    const startOk = !p.activeFrom || (p.activeFrom instanceof Date ? p.activeFrom : new Date(p.activeFrom)) <= now;
    const endOk = !p.activeTo || (p.activeTo instanceof Date ? p.activeTo : new Date(p.activeTo)) >= now;
    return startOk && endOk && (p.kind === kind || (kind === "surcharge" && p.kind === "base"));
  });

  if (candidates.length === 0) return 0;

  candidates.sort((a, b) => {
    const q = (b.minQty ?? 0) - (a.minQty ?? 0);
    if (q !== 0) return q;
    const af = (b.activeFrom ? +new Date(b.activeFrom as any) : 0) - (a.activeFrom ? +new Date(a.activeFrom as any) : 0);
    return af;
  });

  return Number(candidates[0]?.value?.amount) || 0;
};

/* ------------------------------------------------
 * PriceListItem -> price/currency
 * ------------------------------------------------ */
async function getPLIPrice(
  PriceListItem: Model<UPriceListItem>,
  id?: string | Types.ObjectId,
  fallbackCurrency: string = "TRY"
): Promise<{ price: number; currency: string }> {
  if (!id) return { price: 0, currency: fallbackCurrency };

  const pli = await PriceListItem.findById(id)
    .select({ price: 1, amount: 1, currency: 1 })
    .lean<{ price?: number; amount?: number; currency?: string }>();

  const price = numOr0(pli?.price ?? pli?.amount);
  return { price, currency: pli?.currency || fallbackCurrency };
}

/* ------------------------------------------------
 * Types
 * ------------------------------------------------ */
export type ModifierSelection = { groupCode: string; optionCode: string; quantity?: number };

/** Esnek varyant eşleştirici: code, slug, name[*], sizeLabel[*] */
function variantMatches(v: IMenuItemVariant, key?: string) {
  const k = norm(key);
  if (!k) return false;
  if (norm((v as any).code) === k) return true;
  if (norm((v as any).slug) === k) return true;

  const name = (v as any).name || {};
  for (const lang of Object.keys(name)) if (norm(name[lang]) === k) return true;

  const size = (v as any).sizeLabel || {};
  for (const lang of Object.keys(size)) if (norm(size[lang]) === k) return true;

  return false;
}

/** Modifier kural zorlaması (min/max/required) */
function enforceModifierRules(
  item: IMenuItem,
  selections: ModifierSelection[]
): { ok: true } | { ok: false; errorKey: string } {
  const groups = item.modifierGroups || [];
  if (!groups.length && !selections.length) return { ok: true };

  const byGroup = new Map<string, ModifierSelection[]>();
  for (const sel of selections) {
    if (!byGroup.has(sel.groupCode)) byGroup.set(sel.groupCode, []);
    byGroup.get(sel.groupCode)!.push(sel);
  }

  for (const g of groups) {
    const min = Math.max(0, Number(g.minSelect ?? (g.isRequired ? 1 : 0)));
    const max = Number.isFinite(g.maxSelect as any) ? Number(g.maxSelect) : Infinity;

    const chosen = (byGroup.get(g.code) || []).filter(Boolean);
    const qtySum = chosen.reduce((s, c) => s + Math.max(1, Number(c.quantity || 1)), 0);
    const count = qtySum;

    if (g.isRequired && count < 1) return { ok: false, errorKey: "menu.error.modifierRequiredMissing" };
    if (count < min) return { ok: false, errorKey: "menu.error.modifierMinNotMet" };
    if (count > max) return { ok: false, errorKey: "menu.error.modifierMaxExceeded" };

    for (const sel of chosen) {
      const valid = (g.options || []).some((o) => o.code === sel.optionCode);
      if (!valid) return { ok: false, errorKey: "menu.error.modifierOptionInvalid" };
    }
  }
  return { ok: true };
}

/* ------------------------------------------------
 * Menü satırı fiyatlama (fallback'li)
 * ------------------------------------------------ */
async function priceMenuLine(
  MenuItemModel: Model<IMenuItem>,
  PriceListItemModel: Model<UPriceListItem>,
  menuItemId: string,
  tenant: string,
  variantCode?: string,
  modifierSelections: ModifierSelection[] = [],
  depositIncluded = true,
  fallbackCurrency: string = "TRY"
): Promise<
  | {
      unitPrice: number;
      unitCurrency: string;
      priceComponents: {
        base: number;
        deposit: number;
        modifiersTotal: number;
        modifiers: Array<{ code: string; qty: number; unitPrice: number; total: number }>;
        currency: string;
      };
      snapshot: {
        name?: TLabel;
        variantName?: TLabel;
        sizeLabel?: TLabel;
        image?: string;
        allergens?: Array<{ key: string; value: TLabel }>;
        additives?: Array<{ key: string; value: TLabel }>;
        dietary?: {
          vegetarian?: boolean;
          vegan?: boolean;
          containsAlcohol?: boolean;
          spicyLevel?: number;
        };
      };
      selectedVariantCode?: string;
    }
  | { error: string }
> {
  const mi = await MenuItemModel.findOne({ _id: menuItemId, tenant }).lean<IMenuItem>();
  if (!mi) return { error: "menu.error.menuItemNotFound" };

  const variants = (Array.isArray(mi.variants) ? mi.variants : []).filter((v: any) => v?.isActive !== false);
  let variant: IMenuItemVariant | undefined =
    variantCode ? variants.find((v) => variantMatches(v, variantCode)) : undefined;
  if (!variant) variant = variants.find((v: any) => !!v?.isDefault) || (variants.length === 1 ? variants[0] : undefined);
  if (!variant && variants.length > 1) return { error: "menu.error.variantRequired" };

  const ruleCheck = enforceModifierRules(mi, modifierSelections);
  if ("errorKey" in ruleCheck) return { error: ruleCheck.errorKey };

  // --- Fiyatlar
  let currency = (fallbackCurrency || "TRY").toUpperCase();

  // BASE
  let base = 0;
  if ((variant as any)?.priceListItem) {
    const res = await getPLIPrice(PriceListItemModel, (variant as any).priceListItem, currency);
    base = res.price;
    currency = res.currency || currency;
  } else {
    // Önce gömülü prices -> 'base', yoksa eski fallback alanlar
    base =
      pickEmbeddedPriceAmount((variant as any)?.prices, "base") ||
      pickFirstNumber((variant as any)?.price, (variant as any)?.amount, (mi as any)?.basePrice);
  }

  // DEPOSIT
  let deposit = 0;
  if (depositIncluded) {
    if ((variant as any)?.depositPriceListItem) {
      const res = await getPLIPrice(PriceListItemModel, (variant as any).depositPriceListItem, currency);
      deposit = res.price;
      currency = res.currency || currency;
    } else {
      // Gömülü prices -> 'deposit', yoksa eski fallback alanlar
      deposit =
        pickEmbeddedPriceAmount((variant as any)?.prices, "deposit") ||
        pickFirstNumber((variant as any)?.deposit, (mi as any)?.deposit);
    }
  }

  // MODIFIERS
  let modifiersTotal = 0;
  const modifiers: Array<{ code: string; qty: number; unitPrice: number; total: number }> = [];

  for (const sel of modifierSelections) {
    const g = (mi.modifierGroups || []).find((x: IMenuItemModifierGroup) => x.code === sel.groupCode);
    if (!g) return { error: "menu.error.modifierGroupNotFound" };

    const opt = (g.options || []).find((o) => o.code === sel.optionCode);
    if (!opt) return { error: "menu.error.modifierOptionNotFound" };

    let optUnit = 0;
    if (opt.priceListItem) {
      const res = await getPLIPrice(PriceListItemModel, opt.priceListItem, currency);
      optUnit = res.price;
      currency = res.currency || currency;
    } else {
      // TS hatasını çıkaran `opt.amount` kaldırıldı; gömülü prices kullanılıyor
      optUnit = pickEmbeddedPriceAmount((opt as any)?.prices, "surcharge");
    }

    const qty = Math.max(1, numOr0(sel.quantity || 1));
    const total = optUnit * qty;
    modifiersTotal += total;
    modifiers.push({ code: `${g.code}:${opt.code}`, qty, unitPrice: optUnit, total });
  }

  const unitPrice = base + deposit + modifiersTotal;

  const snapshot = {
    name: mi.name || undefined,
    variantName: (variant as any)?.name || undefined,
    sizeLabel: (variant as any)?.sizeLabel || undefined,
    image: mi.images?.[0]?.thumbnail || mi.images?.[0]?.url || undefined,
    allergens: (mi.allergens || []).map((x: any) => ({ key: x.key, value: x.value })),
    additives: (mi.additives || []).map((x: any) => ({ key: x.key, value: x.value })),
    dietary: mi.dietary
      ? {
          vegetarian: !!mi.dietary.vegetarian,
          vegan: !!mi.dietary.vegan,
          containsAlcohol: !!mi.dietary.containsAlcohol,
          spicyLevel: typeof mi.dietary.spicyLevel === "number" ? mi.dietary.spicyLevel : undefined,
        }
      : undefined,
  };

  const finalCurrency = (currency || fallbackCurrency || "TRY").toUpperCase();

  return {
    unitPrice,
    unitCurrency: finalCurrency,
    priceComponents: {
      base,
      deposit,
      modifiersTotal,
      modifiers,
      currency: finalCurrency,
    },
    snapshot,
    selectedVariantCode: (variant as any)?.code || undefined,
  };
}

/* ------------------------------------------------
 * Basit ürün tipi (bike/ensotekprod/sparepart)
 * ------------------------------------------------ */
interface ISimpleProduct {
  _id: Types.ObjectId | string;
  name?: TLabel | Record<string, string>;
  price?: number;
  stock?: number;
}

/* ------------------------------------------------
 * CREATE ORDER
 * ------------------------------------------------ */
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const {
    Order,
    Address,
    Coupon,
    Payment,
    User,
    Notification,
    Bike,
    Ensotekprod,
    Sparepart,
    MenuItem,
    PriceListItem,
    Branch,
  } = await getTenantModels(req);

  const locale: SupportedLocale = (req as any).locale || getLogLocale();
  const t = (k: string, p?: any) => translate(k, locale, orderTranslations, p);

  type ProductType = "bike" | "ensotekprod" | "sparepart" | "menuitem";

  const {
    items,
    addressId,
    shippingAddress,
    paymentMethod,
    couponCode,
    serviceType = "delivery",
    branch,
    tableNo,
    deliveryFee = 0,
    tipAmount = 0,
    serviceFee = 0,
    taxTotal = 0,
    currency: bodyCurrency = "TRY",
  } = req.body;

  const currency = String(bodyCurrency || "TRY").toUpperCase();
  const deliveryFeeN = numOr0(deliveryFee);
  const tipAmountN = numOr0(tipAmount);
  const serviceFeeN = numOr0(serviceFee);
  const taxTotalN = numOr0(taxTotal);

  const userId = req.user?._id;
  const userName = req.user?.name || "";
  const userEmail = req.user?.email || "";

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
    const saBody = (req.body?.shippingAddress || {}) as Partial<IShippingAddress> & {
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
      const ok =
        saBody?.name &&
        saBody?.phone &&
        streetNorm &&
        saBody?.city &&
        saBody?.postalCode &&
        saBody?.country;

      if (!ok) {
        res.status(400).json({ success: false, message: t("error.shippingAddressRequired", locale) });
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
  const modelMap: Record<ProductType, Model<any>> = {
    bike: Bike as Model<any>,
    ensotekprod: Ensotekprod as Model<any>,
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
      const product = await (ProductModel as Model<IMenuItem>)
        .findOne({ _id: raw.product, tenant: req.tenant })
        .lean<IMenuItem>();
      if (!product) {
        res.status(404).json({ success: false, message: t("error.productNotFound") });
        return;
      }

      const menuSel = (raw.menu || {}) as {
        variantCode?: string;
        modifiers?: ModifierSelection[];
        depositIncluded?: boolean;
        notes?: string;
      };

      const priced = await priceMenuLine(
        MenuItem as Model<IMenuItem>,
        PriceListItem as Model<UPriceListItem>,
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
        product: (product as any)._id,
        productType: "menuitem",
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
      } as unknown as IOrderItem);

      const displayName =
        (priced.snapshot?.name as any)?.[locale] ||
        (priced.snapshot?.name as any)?.en ||
        "Item";
      const variantName =
        (priced.snapshot?.variantName as any)?.[locale] ||
        (priced.snapshot?.variantName as any)?.en ||
        "";
      itemsForMail.push(`• ${displayName}${variantName ? ` (${variantName})` : ""} x ${qty}`);
      continue;
    }

    // --- Basit ürünler (bike/ensotekprod/sparepart)
    const product = await (ProductModel as Model<ISimpleProduct>)
      .findOne({ _id: raw.product, tenant: req.tenant })
      .lean<ISimpleProduct>();
    if (!product) {
      res.status(404).json({ success: false, message: t("error.productNotFound") });
      return;
    }
    if (typeof product.stock === "number" && product.stock < Number(raw.quantity || 1)) {
      res.status(400).json({ success: false, message: t("error.insufficientStock") });
      return;
    }

    const qty = Math.max(1, Number(raw.quantity || 1));
    const unitPrice = numOr0(raw.unitPrice ?? product.price);
    const lineTotal = unitPrice * qty;
    subtotal += lineTotal;

    enrichedItems.push({
      product: product._id as any,
      productType: ptype as any,
      quantity: qty,
      tenant: req.tenant,
      unitPrice,
      unitCurrency: currency,
      priceAtAddition: unitPrice,
      totalPriceAtAddition: lineTotal,
    } as unknown as IOrderItem);

    const n = product.name as any;
    itemsForMail.push(`• ${n?.[locale] || n?.en || String(product._id)} – Qty: ${qty}`);
  }

  /* --- Kupon --- */
  let discount = 0;
  let coupon = null as any;
  if (couponCode) {
    const { Coupon } = await getTenantModels(req);
    coupon = await Coupon.findOne({
      code: String(couponCode).trim().toUpperCase(),
      isActive: true,
      tenant: req.tenant,
      expiresAt: { $gte: new Date() },
    }).lean<any>();
    if (!coupon) {
      res.status(400).json({ success: false, message: t("error.invalidCoupon") });
      return;
    }
    discount = Math.round(subtotal * (numOr0(coupon.discount) / 100));
  }

  /* --- Ödeme yöntemi --- */
  const method: PaymentMethod = (paymentMethod as PaymentMethod) || "cash_on_delivery";
  if (!["cash_on_delivery", "credit_card", "paypal"].includes(method)) {
    res.status(400).json({ success: false, message: t("error.invalidPaymentMethod") });
    return;
  }

  /* --- Final toplam --- */
  const finalTotal = Math.max(0, subtotal + deliveryFeeN + tipAmountN + serviceFeeN + taxTotalN - discount);

  /* --- Kayıt --- */
  const order = await Order.create({
    user: userId,
    tenant: req.tenant,
    serviceType: st,
    branch: branch || undefined,
    tableNo: st === "dinein" ? tableNo || undefined : undefined,

    addressId: st === "delivery" ? addressId || undefined : undefined,
    shippingAddress: st === "delivery" ? (shippingAddressWithTenant as any) : undefined,

    items: enrichedItems,

    currency,
    subtotal,
    deliveryFee: deliveryFeeN,
    tipAmount: tipAmountN,
    serviceFee: serviceFeeN,
    taxTotal: taxTotalN,
    discount,
    finalTotal,

    coupon: coupon?._id,
    paymentMethod: method,
    status: "pending",
    isDelivered: false,
    isPaid: false,
    language: locale,
  });

  /* --- Ödeme kaydı (kart/paypal) --- */
  let paymentDoc: any = null;
  if (method === "credit_card" || method === "paypal") {
    const paymentMethodMap = {
      credit_card: "card",
      paypal: "wallet",
      cash_on_delivery: "cash",
    } as const;

    try {
      const { Payment } = await getTenantModels(req);
      paymentDoc = await Payment.create({
        tenant: req.tenant,
        kind: "payment",
        status: "pending",
        method: paymentMethodMap[method],
        provider: method === "paypal" ? "paypal" : undefined,
        grossAmount: finalTotal,
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

  /* --- Email: müşteri & admin --- */
  const tenantData = req.tenantData;
  const brandName =
    tenantData?.name?.[locale] || tenantData?.name?.en || tenantData?.name || "Brand";
  const brandWebsite =
    (tenantData?.domain?.main && `https://${tenantData.domain.main}`) ||
    process.env.BRAND_WEBSITE;
  const senderEmail = tenantData?.emailSettings?.senderEmail || "noreply@example.com";
  const adminEmail = tenantData?.emailSettings?.adminEmail || senderEmail;

  try {
    await sendEmail({
      tenantSlug: req.tenant,
      to: userEmail,
      subject: t("email.subject", { brand: brandName }),
      html: orderConfirmationTemplate({
        name: shippingAddressWithTenant?.name || req.user?.name || "",
        itemsList: itemsForMail.join("<br/>"),
        totalPrice: finalTotal,
        locale,
        brandName,
        brandWebsite,
        senderEmail,
        orderId: String(order._id),
        paymentMethod: t(`payment.method.${method}`),
        paymentStatus: t(`payment.status.pending`),
        criticalStockWarnings: "",
        couponCode: coupon ? `${coupon.code} (${coupon.discount}%)` : null,
        discount,
        finalTotal,
      }) as string,
      from: senderEmail,
    });
  } catch (e) {
    logger.withReq.warn(req, "Customer email send failed", { error: (e as Error)?.message });
  }

  try {
    await sendEmail({
      tenantSlug: req.tenant,
      to: adminEmail,
      subject: t("email.adminSubject", { brand: brandName }),
      html: `
        <h2>🧾 ${t("email.adminOrderTitle", { brand: brandName })}</h2>
        <ul>
          <li><strong>ID:</strong> ${order._id}</li>
          <li><strong>${t("labelServiceType")}:</strong> ${st}</li>
          ${st === "dinein" ? `<li><strong>${t("labelTableNo")}:</strong> ${order.tableNo || "-"}</li>` : ""}
          <li><strong>${t("labelItems")}:</strong> ${itemsForMail.join("<br/>")}</li>
          <li><strong>${t("labelTotal")}:</strong> ${finalTotal} ${currency}</li>
        </ul>
      `,
      from: senderEmail,
    });
  } catch (e) {
    logger.withReq.warn(req, "Admin email send failed", { error: (e as Error)?.message });
  }

  logger.withReq.info(req, t("order.created.success") + ` | Order: ${order._id}`);
  res.status(201).json({
    success: true,
    message: t("order.created.success"),
    data: {
      ...order.toObject(),
      payment: paymentDoc ? paymentDoc.toObject() : undefined,
    },
  });
});


/* --- Sipariş Detay (owner veya admin) --- */
export const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  const { Order } = await getTenantModels(req);
  const locale: SupportedLocale = (req as any).locale || getLogLocale();
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  const order = await Order.findOne({ _id: req.params.id, tenant: req.tenant })
    .populate("items.product")
    .populate("addressId")
    .populate("branch", "code name");

  if (!order) {
    res.status(404).json({ success: false, message: t("error.orderNotFound") });
    return;
  }
  if (order.user?.toString() !== req.user?._id.toString() && req.user?.role !== "admin") {
    res.status(403).json({ success: false, message: t("error.notAuthorizedViewOrder") });
    return;
  }

  res
    .status(200)
    .json({ success: true, message: t("order.fetched.success"), data: order });
});

/* --- Adres güncelle (owner) --- */
export const updateShippingAddress = asyncHandler(async (req: Request, res: Response) => {
  const { Order } = await getTenantModels(req);
  const locale: SupportedLocale = (req as any).locale || getLogLocale();
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  const order = await Order.findOne({ _id: req.params.id, tenant: req.tenant });
  if (!order) {
    res.status(404).json({ success: false, message: t("error.orderNotFound") });
    return;
  }
  if (order.user?.toString() !== req.user?._id.toString()) {
    res.status(403).json({ success: false, message: t("error.notAuthorizedUpdateOrder") });
    return;
  }
  if (order.serviceType !== "delivery") {
    res.status(400).json({ success: false, message: t("error.addressUpdateNotAllowed") });
    return;
  }

  const { shippingAddress } = req.body;
  if (!shippingAddress) {
    res.status(400).json({ success: false, message: t("error.shippingAddressRequired") });
    return;
  }
  order.shippingAddress = { ...(order.shippingAddress as any), ...shippingAddress };
  await order.save();

  logger.withReq.info(req, t("order.addressUpdated.success") + ` | Order: ${order._id}`);
  res
    .status(200)
    .json({ success: true, message: t("order.addressUpdated.success"), data: order });
});

/* --- Kullanıcının siparişleri (opsiyonel serviceType filtresi) --- */
export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const { Order } = await getTenantModels(req);
  const locale: SupportedLocale = (req as any).locale || getLogLocale();
  const t = (k: string, p?: any) => translate(k, locale, translations, p);
  const { serviceType } = req.query as { serviceType?: ServiceType };
  const q: any = { user: req.user?._id, tenant: req.tenant };
  if (serviceType) q.serviceType = serviceType;

  const orders = await Order.find(q)
    .populate("items.product")
    .populate("addressId")
    .populate("branch", "code name")
    .sort({ createdAt: -1 });

  if (!orders || orders.length === 0) {
    res
      .status(404)
      .json({ success: false, message: t("order.noOrdersFound") });
    return;
  }
  res
    .status(200)
    .json({ success: true, message: t("order.fetched.success"), data: orders });
});
