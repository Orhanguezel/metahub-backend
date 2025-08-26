// modules/orders/public.controller.ts
import { Request, Response } from "express";
import type { Model, Types } from "mongoose";
import asyncHandler from "express-async-handler";
import { sendEmail } from "@/services/emailService";
import { orderConfirmationTemplate } from "@/modules/order/templates/orderConfirmation";
import type { SupportedLocale } from "@/types/common";
import { t } from "@/core/utils/i18n/translate";
import orderTranslations from "@/modules/order/i18n";
import logger from "@/core/middleware/logger/logger";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { IOrderItem, IShippingAddress } from "@/modules/order/types";
import type { PaymentMethod, ServiceType } from "@/modules/order/types";

import type {
  IMenuItem,
  IMenuItemModifierGroup,
  IMenuItemVariant,
  TranslatedLabel as TLabel,
} from "@/modules/menuitem/types";

import type { IPriceListItem as UPriceListItem } from "@/modules/pricelist/types";

/* Basit ürün tipi (bike/ensotekprod/sparepart) — fiyat ve stok alanlarını kullanıyoruz */
interface ISimpleProduct {
  _id: Types.ObjectId | string;
  name?: TLabel | Record<string, string>;
  price?: number;
  stock?: number;
}

/* i18n helper */
function orderT(key: string, locale: SupportedLocale, vars?: Record<string, string | number>) {
  return t(key, locale, orderTranslations, vars);
}

/* case-insensitive normalize */
const norm = (s?: string) => String(s || "").trim().toLowerCase();

/* --- PriceListItem'dan fiyatı çek (LIST/CATALOG uyumlu + fallback currency) --- */
async function getPLIPrice(
  PriceListItem: Model<UPriceListItem>,
  id?: string | Types.ObjectId,
  fallbackCurrency: string = "TRY"
): Promise<{ price: number; currency: string }> {
  if (!id) return { price: 0, currency: fallbackCurrency };

  const pli = await PriceListItem.findById(id)
    .select({ price: 1, amount: 1, currency: 1, kind: 1 })
    .lean<{ _id: any; price?: number; amount?: number; currency?: string; kind?: "list" | "catalog" }>();

  const value = Number(
    pli?.price != null ? pli.price :
    pli?.amount != null ? pli.amount : 0
  );

  const currency = pli?.currency || fallbackCurrency;

  return { price: value, currency };
}

/* --- Menü satırı için sunucu tarafı fiyatlama (variant opsiyonel) --- */
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
    const count = qtySum; // Faz-1: min/max için quantity toplamını baz alıyoruz

    if (g.isRequired && count < 1) {
      return { ok: false, errorKey: "menu.error.modifierRequiredMissing" };
    }
    if (count < min) {
      return { ok: false, errorKey: "menu.error.modifierMinNotMet" };
    }
    if (count > max) {
      return { ok: false, errorKey: "menu.error.modifierMaxExceeded" };
    }

    // Seçilen her option gerçekten bu grubun içinde mi?
    for (const sel of chosen) {
      const valid = (g.options || []).some(o => o.code === sel.optionCode);
      if (!valid) return { ok: false, errorKey: "menu.error.modifierOptionInvalid" };
    }
  }
  return { ok: true };
}

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
    }
  | { error: string }
> {
  const mi = await MenuItemModel.findOne({ _id: menuItemId, tenant }).lean<IMenuItem>();
  if (!mi) return { error: "menu.error.menuItemNotFound" };

  // İnaktif varyantları ele
  const allVariants = Array.isArray(mi.variants) ? mi.variants : [];
  const variants = allVariants.filter((v: any) => v?.isActive !== false);

  // Varyant seçim mantığı (esnek eşleşme)
  let variant: IMenuItemVariant | undefined =
    variantCode ? variants.find(v => variantMatches(v, variantCode)) : undefined;

  if (!variant) variant = variants.find(v => !!(v as any).isDefault);
  if (!variant && variants.length === 1) variant = variants[0];

  if (!variant && variants.length > 1) {
    return { error: "menu.error.variantRequired" };
  }

  // --- Modifier kurallarını zorla
 const ruleCheck = enforceModifierRules(mi, modifierSelections);
if ("errorKey" in ruleCheck) {
  return { error: ruleCheck.errorKey };
}



  // Fiyat bileşenleri
  let currency = fallbackCurrency || "TRY";

  // base
  const baseRes = await getPLIPrice(PriceListItemModel, variant?.priceListItem, currency);
  let base = baseRes.price;
  currency = baseRes.currency || currency;

  // deposit
  let deposit = 0;
  if (depositIncluded && variant?.depositPriceListItem) {
    const depRes = await getPLIPrice(PriceListItemModel, variant.depositPriceListItem, currency);
    deposit = depRes.price;
  }

  // Modifiers
  let modifiersTotal = 0;
  const modifiers: Array<{ code: string; qty: number; unitPrice: number; total: number }> = [];

  const canAdoptModifierCurrency = (!variant || !variant.priceListItem) && !!fallbackCurrency;

  for (const sel of modifierSelections) {
    const group = (mi.modifierGroups || []).find(
      (g: IMenuItemModifierGroup) => g.code === sel.groupCode
    );
    if (!group) return { error: "menu.error.modifierGroupNotFound" };

    const opt = (group.options || []).find((o) => o.code === sel.optionCode);
    if (!opt) return { error: "menu.error.modifierOptionNotFound" };

    const optRes = await getPLIPrice(PriceListItemModel, opt.priceListItem, currency);
    const optPrice = optRes.price;
    const qty = Math.max(1, Number(sel.quantity || 1));
    const total = optPrice * qty;

    modifiersTotal += total;
    modifiers.push({ code: `${group.code}:${opt.code}`, qty, unitPrice: optPrice, total });

    if (canAdoptModifierCurrency && optRes.currency && currency === fallbackCurrency) {
      currency = optRes.currency;
    }
  }

  const unitPrice = base + deposit + modifiersTotal;

  const snapshot = {
    name: mi.name || undefined,
    variantName: variant?.name || undefined,
    sizeLabel: variant?.sizeLabel || undefined,
    image: mi.images?.[0]?.thumbnail || mi.images?.[0]?.url || undefined,
    allergens: (mi.allergens || []).map((x) => ({ key: x.key, value: x.value })),
    additives: (mi.additives || []).map((x) => ({ key: x.key, value: x.value })),
    dietary: mi.dietary
      ? {
          vegetarian: !!mi.dietary.vegetarian,
          vegan: !!mi.dietary.vegan,
          containsAlcohol: !!mi.dietary.containsAlcohol,
          spicyLevel: typeof mi.dietary.spicyLevel === "number" ? mi.dietary.spicyLevel : undefined,
        }
      : undefined,
  };

  return {
    unitPrice,
    unitCurrency: currency,
    priceComponents: {
      base,
      deposit,
      modifiersTotal,
      modifiers,
      currency,
    },
    snapshot,
  };
}

/* --- Sipariş OLUŞTUR --- */
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
  const deliveryFeeN = Number(deliveryFee) || 0;
  const tipAmountN = Number(tipAmount) || 0;
  const serviceFeeN = Number(serviceFee) || 0;
  const taxTotalN = Number(taxTotal) || 0;

  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale();
  const userId = req.user?._id;
  const userName = req.user?.name || "";
  const userEmail = req.user?.email || "";

  /* --- Branch ve servis doğrulaması --- */
  let branchDoc: any = null;
  const st: ServiceType = serviceType;
  if (branch) {
    branchDoc = await Branch.findOne({ _id: branch, tenant: req.tenant }).lean();
    if (!branchDoc) {
      res.status(400).json({ success: false, message: orderT("error.branchNotFound", locale) });
      return;
    }
    if (st && Array.isArray(branchDoc.services) && !branchDoc.services.includes(st)) {
      res.status(400).json({
        success: false,
        message: orderT("error.branchServiceNotAvailable", locale),
      });
      return;
    }
  }

  /* --- Adres (delivery → zorunlu) --- */
  let shippingAddressWithTenant: IShippingAddress | undefined;
  if (st === "delivery") {
    if (addressId) {
      const addressDoc = await Address.findOne({ _id: addressId, tenant: req.tenant }).lean<any>();
      if (!addressDoc) {
        res.status(400).json({ success: false, message: orderT("error.addressNotFound", locale) });
        return;
      }
      shippingAddressWithTenant = {
        name: userName,
        tenant: req.tenant,
        phone: addressDoc.phone,
        street: addressDoc.street,
        city: addressDoc.city,
        postalCode: addressDoc.postalCode || "",
        country: addressDoc.country || "TR",
      };
    } else {
      const sa = shippingAddress as IShippingAddress;
      const ok =
        sa?.name && sa?.phone && sa?.street && sa?.city && sa?.postalCode && sa?.country;
      if (!ok) {
        res
          .status(400)
          .json({ success: false, message: orderT("error.shippingAddressRequired", locale) });
        return;
      }
      shippingAddressWithTenant = { ...sa, tenant: req.tenant };
    }
  }

  if (!userEmail) {
    res
      .status(400)
      .json({ success: false, message: orderT("error.userEmailRequired", locale) });
    return;
  }

  /* --- Model map (eski + menuitem) --- */
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
      res
        .status(400)
        .json({ success: false, message: `Model not supported: ${raw.productType}` });
      return;
    }

    if (ptype === "menuitem") {
      const product = await (ProductModel as Model<IMenuItem>)
        .findOne({ _id: raw.product, tenant: req.tenant })
        .lean<IMenuItem>();
      if (!product) {
        res
          .status(404)
          .json({ success: false, message: orderT("error.productNotFound", locale) });
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
        res.status(400).json({ success: false, message: orderT(priced.error, locale) });
        return;
      }

      const qty = Math.max(1, Number(raw.quantity || 1));
      const lineTotal = priced.unitPrice * qty;
      subtotal += lineTotal;

      enrichedItems.push({
        product: product._id as any,
        productType: "menuitem" as any,
        quantity: qty,
        tenant: req.tenant,
        unitPrice: priced.unitPrice,
        unitCurrency: priced.unitCurrency,
        menu: {
          variantCode: menuSel.variantCode,
          modifiers: menuSel.modifiers,
          notes: menuSel.notes,
          depositIncluded: menuSel.depositIncluded ?? true,
          snapshot: priced.snapshot,
        },
        priceComponents: priced.priceComponents,
      } as IOrderItem);

      const displayName =
        (priced.snapshot?.name as any)?.[locale] ||
        (priced.snapshot?.name as any)?.en ||
        "Item";
      const variantName =
        (priced.snapshot?.variantName as any)?.[locale] ||
        (priced.snapshot?.variantName as any)?.en ||
        "";
      itemsForMail.push(
        `• ${displayName}${variantName ? ` (${variantName})` : ""} x ${qty}`
      );
      continue;
    }

    // --- ESKİ MODELLER (bike/ensotekprod/sparepart): stok & fiyat ---
    const product = await (ProductModel as Model<ISimpleProduct>)
      .findOne({ _id: raw.product, tenant: req.tenant })
      .lean<ISimpleProduct>();
    if (!product) {
      res
        .status(404)
        .json({ success: false, message: orderT("error.productNotFound", locale) });
      return;
    }
    if (typeof product.stock === "number" && product.stock < Number(raw.quantity || 1)) {
      res
        .status(400)
        .json({ success: false, message: orderT("error.insufficientStock", locale) });
      return;
    }

    const qty = Math.max(1, Number(raw.quantity || 1));
    const unitPrice = Number(raw.unitPrice ?? product.price ?? 0);
    subtotal += unitPrice * qty;

    enrichedItems.push({
      product: product._id as any,
      productType: ptype as any,
      quantity: qty,
      tenant: req.tenant,
      unitPrice,
      unitCurrency: currency,
    } as IOrderItem);

    const n = product.name as any;
    itemsForMail.push(
      `• ${n?.[locale] || n?.en || String(product._id)} – Qty: ${qty}`
    );
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
      res.status(400).json({ success: false, message: orderT("error.invalidCoupon", locale) });
      return;
    }
    discount = Math.round(subtotal * (Number(coupon.discount || 0) / 100));
  }

  /* --- Ödeme yöntemi --- */
  const method: PaymentMethod =
    (paymentMethod as PaymentMethod) || "cash_on_delivery";
  if (!["cash_on_delivery", "credit_card", "paypal"].includes(method)) {
    res
      .status(400)
      .json({ success: false, message: orderT("error.invalidPaymentMethod", locale) });
    return;
  }

  /* --- Final toplam --- */
  const finalTotal = Math.max(
    0,
    subtotal + deliveryFeeN + tipAmountN + serviceFeeN + taxTotalN - discount
  );

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
        method: paymentMethodMap[method],   // "card" | "wallet"
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
      subject: orderT("email.subject", locale, { brand: brandName }),
      html: orderConfirmationTemplate({
        name: shippingAddressWithTenant?.name || req.user?.name || "",
        itemsList: itemsForMail.join("<br/>"),
        totalPrice: finalTotal,
        locale,
        brandName,
        brandWebsite,
        senderEmail,
        orderId: String(order._id),
        paymentMethod: orderT(`payment.method.${method}`, locale),
        paymentStatus: orderT(`payment.status.pending`, locale),
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
      subject: orderT("email.adminSubject", locale, { brand: brandName }),
      html: `
        <h2>🧾 ${orderT("email.adminOrderTitle", locale, { brand: brandName })}</h2>
        <ul>
          <li><strong>ID:</strong> ${order._id}</li>
          <li><strong>${orderT("labelServiceType", locale)}:</strong> ${st}</li>
          ${st === "dinein" ? `<li><strong>${orderT("labelTableNo", locale)}:</strong> ${order.tableNo || "-"}</li>` : ""}
          <li><strong>${orderT("labelItems", locale)}:</strong> ${itemsForMail.join("<br/>")}</li>
          <li><strong>${orderT("labelTotal", locale)}:</strong> ${finalTotal} ${currency}</li>
        </ul>
      `,
      from: senderEmail,
    });
  } catch (e) {
    logger.withReq.warn(req, "Admin email send failed", { error: (e as Error)?.message });
  }

  logger.withReq.info(req, orderT("order.created.success", locale) + ` | Order: ${order._id}`);
  res.status(201).json({
    success: true,
    message: orderT("order.created.success", locale),
    data: {
      ...order.toObject(),
      payment: paymentDoc ? paymentDoc.toObject() : undefined,
    },
  });
});

/* --- Sipariş Detay (owner veya admin) --- */
export const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  const { Order } = await getTenantModels(req);
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale();

  const order = await Order.findOne({ _id: req.params.id, tenant: req.tenant })
    .populate("items.product")
    .populate("addressId")
    .populate("branch", "code name");

  if (!order) {
    res.status(404).json({ success: false, message: orderT("error.orderNotFound", locale) });
    return;
  }
  if (order.user?.toString() !== req.user?._id.toString() && req.user?.role !== "admin") {
    res.status(403).json({ success: false, message: orderT("error.notAuthorizedViewOrder", locale) });
    return;
  }

  res
    .status(200)
    .json({ success: true, message: orderT("order.fetched.success", locale), data: order });
});

/* --- Adres güncelle (owner) --- */
export const updateShippingAddress = asyncHandler(async (req: Request, res: Response) => {
  const { Order } = await getTenantModels(req);
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale();

  const order = await Order.findOne({ _id: req.params.id, tenant: req.tenant });
  if (!order) {
    res.status(404).json({ success: false, message: orderT("error.orderNotFound", locale) });
    return;
  }
  if (order.user?.toString() !== req.user?._id.toString()) {
    res.status(403).json({ success: false, message: orderT("error.notAuthorizedUpdateOrder", locale) });
    return;
  }
  if (order.serviceType !== "delivery") {
    res.status(400).json({ success: false, message: orderT("error.addressUpdateNotAllowed", locale) });
    return;
  }

  const { shippingAddress } = req.body;
  if (!shippingAddress) {
    res.status(400).json({ success: false, message: orderT("error.shippingAddressRequired", locale) });
    return;
  }
  order.shippingAddress = { ...(order.shippingAddress as any), ...shippingAddress };
  await order.save();

  logger.withReq.info(req, orderT("order.addressUpdated.success", locale) + ` | Order: ${order._id}`);
  res
    .status(200)
    .json({ success: true, message: orderT("order.addressUpdated.success", locale), data: order });
});

/* --- Kullanıcının siparişleri (opsiyonel serviceType filtresi) --- */
export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const { Order } = await getTenantModels(req);
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
      .json({ success: false, message: orderT("order.noOrdersFound", (req.locale as any) || getLogLocale()) });
    return;
  }
  res
    .status(200)
    .json({ success: true, message: orderT("order.fetched.success", (req.locale as any) || getLogLocale()), data: orders });
});
