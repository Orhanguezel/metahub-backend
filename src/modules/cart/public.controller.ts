import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { Types, Model } from "mongoose";
import { ICartItem, ModifierSelection } from "@/modules/cart/types";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import cartTranslations from "@/modules/cart/i18n";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

/* ---- i18n helper ---- */
function cartT(key: string, locale: SupportedLocale, vars?: Record<string, any>) {
  return t(key, locale, cartTranslations, vars);
}

/* ---- toplam hesap ---- */
const recalculateTotal = (items: ICartItem[]): number =>
  items.reduce((sum, item) => sum + item.quantity * item.priceAtAddition, 0);

/* ---- küçük util ---- */
const norm = (s?: string) => String(s || "").trim().toLowerCase();

/* ---- PriceListItem'dan fiyat (LIST/CATALOG uyumlu) ---- */
async function getPLIPrice(
  PriceListItem: Model<any>,
  id?: string,
  fallbackCurrency = "TRY"
): Promise<{ price: number; currency: string }> {
  if (!id) return { price: 0, currency: fallbackCurrency };
  const pli = await PriceListItem.findById(id)
    .select({ price: 1, amount: 1, currency: 1, kind: 1 })
    .lean<{ price?: number; amount?: number; currency?: string; kind?: "list" | "catalog" }>();
  const price = Number(pli?.price ?? pli?.amount ?? 0);
  const currency = pli?.currency || fallbackCurrency;
  return { price, currency };
}

/* ---- Menü satırı fiyatlama (variant opsiyonel) ---- */
async function priceMenuLine(
  MenuItem: Model<any>,
  PriceListItem: Model<any>,
  menuItemId: string,
  tenant: string,
  variantCode?: string,
  modifierSelections: ModifierSelection[] = [],
  depositIncluded = true,
  fallbackCurrency = "TRY"
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
        name?: Record<string, string>;
        variantName?: Record<string, string>;
        sizeLabel?: Record<string, string>;
        image?: string;
        allergens?: Array<{ key: string; value: Record<string, string> }>;
        additives?: Array<{ key: string; value: Record<string, string> }>;
        dietary?: { vegetarian?: boolean; vegan?: boolean; containsAlcohol?: boolean; spicyLevel?: number };
      };
    }
  | { error: string }
> {
  const mi = await MenuItem.findOne({ _id: menuItemId, tenant }).lean<any>();
  if (!mi) return { error: "menu.error.menuItemNotFound" };

  const variants = Array.isArray(mi.variants) ? mi.variants : [];
  let variant = variantCode ? variants.find((v: any) => norm(v.code) === norm(variantCode)) : undefined;
  if (!variant) variant = variants.find((v: any) => !!v.isDefault);
  if (!variant && variants.length === 1) variant = variants[0];
  if (!variant && variants.length > 1) return { error: "menu.error.variantRequired" };

  let currency = fallbackCurrency || "TRY";
  const baseRes = await getPLIPrice(PriceListItem, variant?.priceListItem, currency);
  const base = baseRes.price;
  currency = baseRes.currency || currency;

  let deposit = 0;
  if (depositIncluded && variant?.depositPriceListItem) {
    const d = await getPLIPrice(PriceListItem, variant.depositPriceListItem, currency);
    deposit = d.price;
  }

  let modifiersTotal = 0;
  const modifiers: Array<{ code: string; qty: number; unitPrice: number; total: number }> = [];

  for (const sel of modifierSelections) {
    const group = (mi.modifierGroups || []).find((g: any) => g.code === sel.groupCode);
    if (!group) return { error: "menu.error.modifierGroupNotFound" };
    const opt = (group.options || []).find((o: any) => o.code === sel.optionCode);
    if (!opt) return { error: "menu.error.modifierOptionNotFound" };

    const optRes = await getPLIPrice(PriceListItem, opt.priceListItem, currency);
    const qty = Math.max(1, Number(sel.quantity || 1));
    const total = optRes.price * qty;

    modifiersTotal += total;
    modifiers.push({ code: `${group.code}:${opt.code}`, qty, unitPrice: optRes.price, total });
  }

  const unitPrice = base + deposit + modifiersTotal;

  const snapshot = {
    name: mi.name || undefined,
    variantName: variant?.name || undefined,
    sizeLabel: variant?.sizeLabel || undefined,
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

  return {
    unitPrice,
    unitCurrency: currency,
    priceComponents: { base, deposit, modifiersTotal, modifiers, currency },
    snapshot,
  };
}

/* ---- ürün fetch (dinamik) ---- */
const getProduct = async (
  req: Request,
  productId: string,
  productType: "bike" | "ensotekprod" | "sparepart" | "menuitem"
) => {
  const { Bike, Ensotekprod, Sparepart, MenuItem } = await getTenantModels(req);
  if (productType === "ensotekprod") return Ensotekprod.findOne({ _id: productId, tenant: req.tenant });
  if (productType === "sparepart") return Sparepart.findOne({ _id: productId, tenant: req.tenant });
  if (productType === "menuitem") return MenuItem.findOne({ _id: productId, tenant: req.tenant });
  return Bike.findOne({ _id: productId, tenant: req.tenant });
};

/* ---- kullanıcı sepeti getir ---- */
const getCartForUser = async (req: Request, userId: string, populate = false) => {
  const { Cart } = await getTenantModels(req);
  return populate
    ? Cart.findOne({ user: userId, tenant: req.tenant }).populate({ path: "items.product", strictPopulate: false })
    : Cart.findOne({ user: userId, tenant: req.tenant });
};

/* ====== Handlers ====== */

export const getUserCart = asyncHandler(async (req: Request, res: Response) => {
  const locale = (req.locale as SupportedLocale) || "en";
  const userId = req.user?.id;
  if (!userId) {
    logger.withReq.warn(req, cartT("cart.authRequired", locale));
    res.status(401).json({ success: false, message: cartT("cart.authRequired", locale) });
    return;
  }

  let cart = await getCartForUser(req, userId, true);
  if (!cart) {
    const { Cart } = await getTenantModels(req);
    cart = new Cart({ user: userId, tenant: req.tenant, items: [], totalPrice: 0, couponCode: null, language: locale });
    await cart.save();
    logger.withReq.info(req, cartT("cart.created", locale, { userId }));
    res.status(201).json({ success: true, message: cartT("cart.created", locale), data: cart });
    return;
  }

  cart.totalPrice = recalculateTotal(cart.items);
  await cart.save();
  logger.withReq.info(req, cartT("cart.fetched", locale, { userId }));
  res.status(200).json({ success: true, data: cart });
});

export const addToCart = asyncHandler(async (req: Request, res: Response) => {
  const locale = (req.locale as SupportedLocale) || "en";
  const userId = req.user?.id;
  const { productId, productType, quantity, menu, currency } = req.body as {
    productId: string;
    productType: "bike" | "ensotekprod" | "sparepart" | "menuitem";
    quantity: number;
    menu?: { variantCode?: string; modifiers?: ModifierSelection[]; depositIncluded?: boolean; notes?: string };
    currency?: string;
  };

  if (!userId || !productId || !productType || quantity <= 0) {
    logger.withReq.warn(req, cartT("cart.add.invalidInput", locale));
    res.status(400).json({ success: false, message: cartT("cart.add.invalidInput", locale) });
    return;
  }

  const product = await getProduct(req, productId, productType);
  if (!product) {
    logger.withReq.warn(req, cartT("cart.add.productNotFound", locale, { productId }));
    res.status(404).json({ success: false, message: cartT("cart.add.productNotFound", locale) });
    return;
  }

  // stok kontrolü (menuitem genelde stok tutmaz)
  if (productType !== "menuitem" && typeof (product as any).stock === "number" && (product as any).stock < quantity) {
    logger.withReq.warn(req, cartT("cart.add.stockNotEnough", locale, { stock: (product as any).stock }));
    res.status(400).json({
      success: false,
      message: cartT("cart.add.stockNotEnough", locale, { stock: (product as any).stock }),
    });
    return;
  }

  const fallbackCurrency = currency || "TRY";
  let unitPrice = 0;
  let unitCurrency: string | undefined;
  let menuSelection: ICartItem["menu"] | undefined;
  let priceComponents: ICartItem["priceComponents"] | undefined;

  if (productType === "menuitem") {
    const { MenuItem, PriceListItem } = await getTenantModels(req);
    const priced = await priceMenuLine(
      MenuItem,
      PriceListItem,
      productId,
      req.tenant,
      menu?.variantCode,
      menu?.modifiers || [],
      menu?.depositIncluded ?? true,
      fallbackCurrency
    );
    if ("error" in priced) {
      res.status(400).json({ success: false, message: priced.error });
      return;
    }
    unitPrice = priced.unitPrice;
    unitCurrency = priced.unitCurrency;
    menuSelection = {
      variantCode: menu?.variantCode,
      modifiers: menu?.modifiers || [],
      depositIncluded: menu?.depositIncluded ?? true,
      notes: menu?.notes,
      snapshot: priced.snapshot,
    };
    priceComponents = priced.priceComponents;
  } else {
    unitPrice = Number((product as any).price ?? 0);
    unitCurrency = fallbackCurrency;
  }

  let cart = await getCartForUser(req, userId);
  if (!cart) {
    const { Cart } = await getTenantModels(req);
    cart = new Cart({ user: userId, items: [], tenant: req.tenant, totalPrice: 0, couponCode: null, language: locale });
  }

  const idx = cart.items.findIndex(
    (it) =>
      it.product.toString() === productId &&
      it.productType === productType &&
      JSON.stringify(it.menu?.variantCode || "") === JSON.stringify(menuSelection?.variantCode || "") &&
      JSON.stringify(it.menu?.modifiers || []) === JSON.stringify(menuSelection?.modifiers || [])
  );

  if (idx > -1) {
    cart.items[idx].quantity += quantity;
    // menuitem ise priceAtAddition SABİT kalır; diğerlerinde de sabit kalsın.
    cart.items[idx].totalPriceAtAddition = cart.items[idx].quantity * cart.items[idx].priceAtAddition;
  } else {
    cart.items.push({
      product: Types.ObjectId.createFromHexString(productId),
      productType,
      tenant: req.tenant,
      quantity,
      priceAtAddition: unitPrice,
      totalPriceAtAddition: unitPrice * quantity,
      unitCurrency,
      menu: menuSelection,
      priceComponents,
    } as ICartItem);
  }

  cart.totalPrice = recalculateTotal(cart.items);
  await cart.save();

  const isCritical =
    productType !== "menuitem" &&
    typeof (product as any).stock === "number" &&
    (product as any).stock - quantity <= ((product as any).stockThreshold || 5);
  const warning = isCritical ? cartT("cart.add.criticalStock", locale) : undefined;

  logger.withReq.info(req, cartT("cart.add.success", locale, { product: productId, userId }));
  res.status(201).json({ success: true, message: cartT("cart.add.success", locale), data: cart, warning });
});

export const increaseQuantity = asyncHandler(async (req: Request, res: Response) => {
  const locale = (req.locale as SupportedLocale) || "en";
  const userId = req.user?.id;
  const { productId, productType } = req.body;

  if (!userId || !productId || !productType) {
    logger.withReq.warn(req, cartT("cart.inc.invalidInput", locale));
    res.status(400).json({ success: false, message: cartT("cart.inc.invalidInput", locale) });
    return;
  }

  const cart = await getCartForUser(req, userId, true);
  if (!cart) {
    logger.withReq.warn(req, cartT("cart.notFound", locale));
    res.status(404).json({ success: false, message: cartT("cart.notFound", locale) });
    return;
  }

  const itemIndex = cart.items.findIndex(
    (item) => (item.product as any)?._id?.toString() === productId && item.productType === productType
  );
  if (itemIndex === -1) {
    logger.withReq.warn(req, cartT("cart.inc.notInCart", locale));
    res.status(404).json({ success: false, message: cartT("cart.inc.notInCart", locale) });
    return;
  }

  const product = await getProduct(req, productId, productType);
  if (!product) {
    logger.withReq.warn(req, cartT("cart.add.productNotFound", locale, { productId }));
    res.status(404).json({ success: false, message: cartT("cart.add.productNotFound", locale) });
    return;
  }

  if (productType !== "menuitem" && typeof (product as any).stock === "number") {
    if (cart.items[itemIndex].quantity >= (product as any).stock) {
      logger.withReq.warn(req, cartT("cart.inc.stockLimit", locale));
      res.status(400).json({ success: false, message: cartT("cart.inc.stockLimit", locale) });
      return;
    }
  }

  cart.items[itemIndex].quantity += 1;

  // Not: priceAtAddition'ı değiştirmiyoruz (menuitem’de zaten hesaplandı, diğerlerinde ekleme anı fiyatı)
  cart.items[itemIndex].totalPriceAtAddition =
    cart.items[itemIndex].quantity * cart.items[itemIndex].priceAtAddition;

  cart.totalPrice = recalculateTotal(cart.items);
  await cart.save();

  const isCritical =
    productType !== "menuitem" &&
    typeof (product as any).stock === "number" &&
    (product as any).stock - cart.items[itemIndex].quantity <= ((product as any).stockThreshold || 5);
  const warning = isCritical ? cartT("cart.add.criticalStock", locale) : undefined;

  logger.withReq.info(req, cartT("cart.inc.success", locale, { product: productId, userId }));
  res.status(200).json({ success: true, message: cartT("cart.inc.success", locale), data: cart, warning });
});

export const decreaseQuantity = asyncHandler(async (req: Request, res: Response) => {
  const locale = (req.locale as SupportedLocale) || "en";
  const userId = req.user?.id;
  const { productId, productType } = req.body;

  if (!userId || !productId || !productType) {
    logger.withReq.warn(req, cartT("cart.dec.invalidInput", locale));
    res.status(400).json({ success: false, message: cartT("cart.dec.invalidInput", locale) });
    return;
  }

  const cart = await getCartForUser(req, userId, true);
  if (!cart) {
    logger.withReq.warn(req, cartT("cart.notFound", locale));
    res.status(404).json({ success: false, message: cartT("cart.notFound", locale) });
    return;
  }

  const itemIndex = cart.items.findIndex(
    (item) => (item.product as any)?._id?.toString() === productId && item.productType === productType
  );
  if (itemIndex === -1) {
    logger.withReq.warn(req, cartT("cart.dec.notInCart", locale));
    res.status(404).json({ success: false, message: cartT("cart.dec.notInCart", locale) });
    return;
  }

  if (cart.items[itemIndex].quantity > 1) {
    cart.items[itemIndex].quantity -= 1;
    cart.items[itemIndex].totalPriceAtAddition =
      cart.items[itemIndex].quantity * cart.items[itemIndex].priceAtAddition;
  } else {
    cart.items.splice(itemIndex, 1);
  }

  cart.totalPrice = recalculateTotal(cart.items);
  await cart.save();

  logger.withReq.info(req, cartT("cart.dec.success", locale, { product: productId, userId }));
  res.status(200).json({ success: true, message: cartT("cart.dec.success", locale), data: cart });
});

export const removeFromCart = asyncHandler(async (req: Request, res: Response) => {
  const locale = (req.locale as SupportedLocale) || "en";
  const userId = req.user?.id;
  const { productId, productType } = req.body;

  if (!userId || !productId || !productType) {
    logger.withReq.warn(req, cartT("cart.remove.invalidInput", locale));
    res.status(400).json({ success: false, message: cartT("cart.remove.invalidInput", locale) });
    return;
  }

  const cart = await getCartForUser(req, userId, true);
  if (!cart) {
    logger.withReq.warn(req, cartT("cart.notFound", locale));
    res.status(404).json({ success: false, message: cartT("cart.notFound", locale) });
    return;
  }

  const itemIndex = cart.items.findIndex(
    (item) => (item.product as any)?._id?.toString() === productId && item.productType === productType
  );
  if (itemIndex === -1) {
    logger.withReq.warn(req, cartT("cart.remove.notInCart", locale));
    res.status(404).json({ success: false, message: cartT("cart.remove.notInCart", locale) });
    return;
  }

  cart.items.splice(itemIndex, 1);
  cart.totalPrice = recalculateTotal(cart.items);
  await cart.save();

  logger.withReq.info(req, cartT("cart.remove.success", locale, { product: productId, userId }));
  res.status(200).json({ success: true, message: cartT("cart.remove.success", locale), data: cart });
});

export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  const locale = (req.locale as SupportedLocale) || "en";
  const userId = req.user?.id;

  if (!userId) {
    logger.withReq.warn(req, cartT("cart.authRequired", locale));
    res.status(401).json({ success: false, message: cartT("cart.authRequired", locale) });
    return;
  }

  const cart = await getCartForUser(req, userId, true);
  if (!cart) {
    logger.withReq.warn(req, cartT("cart.notFound", locale));
    res.status(404).json({ success: false, message: cartT("cart.notFound", locale) });
    return;
  }

  if (!cart.items.length) {
    logger.withReq.warn(req, cartT("cart.clear.alreadyEmpty", locale));
    res.status(400).json({ success: false, message: cartT("cart.clear.alreadyEmpty", locale) });
    return;
  }

  cart.items = [];
  cart.totalPrice = 0;
  await cart.save();

  logger.withReq.info(req, cartT("cart.clear.success", locale, { userId }));
  res.status(200).json({ success: true, message: cartT("cart.clear.success", locale), data: cart });
});


/* ===================== CART LINE (MENU) ===================== */

export const addCartLine = asyncHandler(async (req: Request, res: Response) => {
  const locale = (req.locale as SupportedLocale) || "en";
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: cartT("cart.authRequired", locale) });
    return;
  }

  const {
    menuItemId,
    quantity = 1,
    variantCode,
    modifiers = [],
    depositIncluded = true,
    notes,
    currency = "TRY",
  }: {
    menuItemId: string;
    quantity?: number;
    variantCode?: string;
    modifiers?: ModifierSelection[];
    depositIncluded?: boolean;
    notes?: string;
    currency?: string;
  } = req.body || {};

  const { MenuItem, PriceListItem, Cart } = await getTenantModels(req);

  // fiyatlama (menuitem)
  const priced = await priceMenuLine(
    MenuItem,
    PriceListItem,
    String(menuItemId),
    req.tenant,
    variantCode,
    modifiers,
    depositIncluded,
    currency
  );
  if ("error" in priced) {
    res.status(422).json({ success: false, message: priced.error });
    return;
  }

  // sepete ekle
  let cart = await getCartForUser(req, userId);
  if (!cart) cart = new Cart({ user: userId, items: [], tenant: req.tenant, totalPrice: 0, language: locale });

  cart.items.push({
    product: Types.ObjectId.createFromHexString(String(menuItemId)),
    productType: "menuitem",
    tenant: req.tenant,
    quantity: Math.max(1, Number(quantity || 1)),
    priceAtAddition: priced.unitPrice,
    totalPriceAtAddition: priced.unitPrice * Math.max(1, Number(quantity || 1)),
    unitCurrency: priced.unitCurrency,
    menu: {
      variantCode,
      modifiers,
      depositIncluded,
      notes,
      snapshot: priced.snapshot,
    },
    priceComponents: priced.priceComponents,
  } as ICartItem);

  cart.totalPrice = recalculateTotal(cart.items);
  await cart.save();

  logger.withReq.info(req, cartT("cart.line.add.success", locale, { userId }));
  res.status(201).json({ success: true, message: cartT("cart.line.add.success", locale), data: cart });
});

export const updateCartLine = asyncHandler(async (req: Request, res: Response) => {
  const locale = (req.locale as SupportedLocale) || "en";
  const userId = req.user?.id;
  const { lineId } = req.params;

  if (!userId) {
    res.status(401).json({ success: false, message: cartT("cart.authRequired", locale) });
    return;
  }

  const {
    quantity,
    variantCode,
    modifiers,
    depositIncluded,
    notes,
    currency = "TRY",
  }: {
    quantity?: number;
    variantCode?: string;
    modifiers?: ModifierSelection[];
    depositIncluded?: boolean;
    notes?: string;
    currency?: string;
  } = req.body || {};

  const cart = await getCartForUser(req, userId);
  if (!cart) {
    res.status(404).json({ success: false, message: cartT("cart.notFound", locale) });
    return;
  }

  const idx = cart.items.findIndex((it: any) => String((it as any)._id) === String(lineId));
  if (idx === -1) {
    res.status(404).json({ success: false, message: cartT("cart.line.notFound", locale) });
    return;
  }

  const line = cart.items[idx];
  if (line.productType !== "menuitem") {
    res.status(400).json({ success: false, message: cartT("cart.line.onlyMenuEditable", locale) });
    return;
  }

  // miktar güncelle
  if (quantity != null) {
    const q = Math.max(1, Number(quantity));
    line.quantity = q;
  }

  // varyant/modifier değişiyorsa yeniden fiyatla
  if (variantCode != null || modifiers != null || depositIncluded != null || notes != null) {
    const { MenuItem, PriceListItem } = await getTenantModels(req);
    const priced = await priceMenuLine(
      MenuItem,
      PriceListItem,
      String(line.product),
      req.tenant,
      variantCode ?? line.menu?.variantCode,
      (modifiers as ModifierSelection[] | undefined) ?? line.menu?.modifiers ?? [],
      depositIncluded ?? line.menu?.depositIncluded ?? true,
      currency
    );
    if ("error" in priced) {
      res.status(422).json({ success: false, message: priced.error });
      return;
    }

    line.priceAtAddition = priced.unitPrice;
    line.totalPriceAtAddition = priced.unitPrice * line.quantity;
    line.unitCurrency = priced.unitCurrency;
    line.menu = {
      variantCode: variantCode ?? line.menu?.variantCode,
      modifiers: (modifiers as ModifierSelection[] | undefined) ?? line.menu?.modifiers ?? [],
      depositIncluded: depositIncluded ?? line.menu?.depositIncluded ?? true,
      notes: notes ?? line.menu?.notes,
      snapshot: priced.snapshot,
    };
    line.priceComponents = priced.priceComponents;
  }

  cart.items[idx] = line;
  cart.totalPrice = recalculateTotal(cart.items);
  await cart.save();

  logger.withReq.info(req, cartT("cart.line.update.success", locale, { userId, lineId }));
  res.status(200).json({ success: true, message: cartT("cart.line.update.success", locale), data: cart });
});

export const removeCartLine = asyncHandler(async (req: Request, res: Response) => {
  const locale = (req.locale as SupportedLocale) || "en";
  const userId = req.user?.id;
  const { lineId } = req.params;

  if (!userId) {
    res.status(401).json({ success: false, message: cartT("cart.authRequired", locale) });
    return;
  }

  const cart = await getCartForUser(req, userId);
  if (!cart) {
    res.status(404).json({ success: false, message: cartT("cart.notFound", locale) });
    return;
  }

  const before = cart.items.length;
  cart.items = cart.items.filter((it: any) => String((it as any)._id) !== String(lineId));
  if (cart.items.length === before) {
    res.status(404).json({ success: false, message: cartT("cart.line.notFound", locale) });
    return;
  }

  cart.totalPrice = recalculateTotal(cart.items);
  await cart.save();

  logger.withReq.info(req, cartT("cart.line.remove.success", locale, { userId, lineId }));
  res.status(200).json({ success: true, message: cartT("cart.line.remove.success", locale), data: cart });
});

export const updateCartPricing = asyncHandler(async (req: Request, res: Response) => {
  const locale = (req.locale as SupportedLocale) || "en";
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: cartT("cart.authRequired", locale) });
    return;
  }

  const {
    tipAmount = 0,
    deliveryFee = 0,
    serviceFee = 0,
    couponCode,
    currency = "TRY",
  }: { tipAmount?: number; deliveryFee?: number; serviceFee?: number; couponCode?: string; currency?: string } =
    req.body || {};

  const cart = await getCartForUser(req, userId);
  if (!cart) {
    res.status(404).json({ success: false, message: cartT("cart.notFound", locale) });
    return;
  }

  // Kupon (opsiyonel)
  let discount = 0;
  let coupon: any = null;
  if (couponCode) {
    const { Coupon } = await getTenantModels(req);
    coupon = await Coupon.findOne({
      code: String(couponCode).trim().toUpperCase(),
      isActive: true,
      tenant: req.tenant,
      expiresAt: { $gte: new Date() },
    }).lean<any>();
    if (!coupon) {
      res.status(400).json({ success: false, message: cartT("cart.coupon.invalid", locale) });
      return;
    }
  }

  const itemsTotal = recalculateTotal(cart.items);
  if (coupon) discount = Math.round(itemsTotal * (Number(coupon.discount || 0) / 100));

  // cart alanlarını güncelle (şema esnek ise top-level tutuyoruz)
  (cart as any).tipAmount = Number(tipAmount) || 0;
  (cart as any).deliveryFee = Number(deliveryFee) || 0;
  (cart as any).serviceFee = Number(serviceFee) || 0;
  (cart as any).couponCode = coupon?.code || couponCode || null;
  (cart as any).currency = currency || (cart as any).currency || "TRY";

  const grandTotal =
    itemsTotal + Number(deliveryFee || 0) + Number(serviceFee || 0) + Number(tipAmount || 0) - discount;

  // klasik totalPrice’ı (items toplamı) koruyoruz
  cart.totalPrice = itemsTotal;
  await cart.save();

  logger.withReq.info(req, cartT("cart.pricing.update.success", locale, { userId }));
  res.status(200).json({
    success: true,
    message: cartT("cart.pricing.update.success", locale),
    data: cart,
    meta: {
      totals: {
        itemsTotal,
        deliveryFee: Number(deliveryFee || 0),
        serviceFee: Number(serviceFee || 0),
        tipAmount: Number(tipAmount || 0),
        discount,
        grandTotal: Math.max(0, grandTotal),
        currency: (cart as any).currency || "TRY",
      },
    },
  });
});

export const checkoutCart = asyncHandler(async (req: Request, res: Response) => {
  const locale = (req.locale as SupportedLocale) || "en";
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: cartT("cart.authRequired", locale) });
    return;
  }

  const {
    serviceType = "delivery",
    branch,
    addressId,
    shippingAddress,
    paymentMethod = "cash_on_delivery",
    currency = "TRY",
  } = req.body || {};

  const {
    Order,
    Address,
    Branch,
    Coupon,
    Payment,
  } = await getTenantModels(req);

  // sepeti getir
  const cart = await getCartForUser(req, userId);
  if (!cart || !cart.items?.length) {
    res.status(400).json({ success: false, message: cartT("cart.checkout.empty", locale) });
    return;
  }

  // branch & service guard
  let branchDoc: any = null;
  if (branch) {
    branchDoc = await Branch.findOne({ _id: branch, tenant: req.tenant }).lean();
    if (!branchDoc) {
      res.status(404).json({ success: false, message: cartT("cart.checkout.branchNotFound", locale) });
      return;
    }
    if (serviceType && Array.isArray(branchDoc.services) && !branchDoc.services.includes(serviceType)) {
      res.status(400).json({ success: false, message: cartT("cart.checkout.serviceNotAvailable", locale) });
      return;
    }
  }

  // adres guard
  let shippingAddressWithTenant: any;
  if (serviceType === "delivery") {
    if (addressId) {
      const addr = await Address.findOne({ _id: addressId, tenant: req.tenant }).lean<any>();
      if (!addr) {
        res.status(400).json({ success: false, message: cartT("cart.checkout.addressNotFound", locale) });
        return;
      }
      shippingAddressWithTenant = {
        tenant: req.tenant,
        name: req.user?.name,
        phone: addr.phone,
        street: addr.street,
        city: addr.city,
        postalCode: addr.postalCode || "",
        country: addr.country || "TR",
      };
    } else {
      const sa = shippingAddress || {};
      const ok = sa?.name && sa?.phone && sa?.street && sa?.city && sa?.postalCode && sa?.country;
      if (!ok) {
        res.status(400).json({ success: false, message: cartT("cart.checkout.addressRequired", locale) });
        return;
      }
      shippingAddressWithTenant = { ...sa, tenant: req.tenant };
    }
  }

  // kalemleri order'a dönüştür
  const enrichedItems = cart.items.map((it) => ({
    product: it.product,
    productType: it.productType,
    quantity: it.quantity,
    tenant: req.tenant,
    unitPrice: it.priceAtAddition,
    unitCurrency: it.unitCurrency || currency,
    menu: it.menu,                 // snapshot dahil
    priceComponents: it.priceComponents,
  }));

  // totals
  const itemsTotal = recalculateTotal(cart.items);
  let discount = 0;
  let coupon: any = null;

  if ((cart as any).couponCode) {
    coupon = await Coupon.findOne({
      code: String((cart as any).couponCode).trim().toUpperCase(),
      isActive: true,
      tenant: req.tenant,
      expiresAt: { $gte: new Date() },
    }).lean<any>();
    if (coupon) discount = Math.round(itemsTotal * (Number(coupon.discount || 0) / 100));
  }

  const deliveryFee = Number((cart as any).deliveryFee || 0);
  const tipAmount = Number((cart as any).tipAmount || 0);
  const serviceFee = Number((cart as any).serviceFee || 0);
  const taxTotal = Number((cart as any).taxTotal || 0);

  const finalTotal = Math.max(0, itemsTotal + deliveryFee + serviceFee + tipAmount + taxTotal - discount);

  // order create
  const order = await Order.create({
    user: req.user?._id,
    tenant: req.tenant,
    serviceType,
    branch: branch || undefined,
    addressId: serviceType === "delivery" ? addressId || undefined : undefined,
    shippingAddress: serviceType === "delivery" ? shippingAddressWithTenant : undefined,
    items: enrichedItems,
    currency: (cart as any).currency || currency,
    subtotal: itemsTotal,
    deliveryFee,
    tipAmount,
    serviceFee,
    taxTotal,
    discount,
    finalTotal,
    coupon: coupon?._id,
    paymentMethod,
    status: "pending",
    isDelivered: false,
    isPaid: false,
    language: locale,
  });

  // ödeme kaydı (kart/paypal)
  if (paymentMethod === "credit_card" || paymentMethod === "paypal") {
    const methodMap = { credit_card: "card", paypal: "wallet", cash_on_delivery: "cash" } as const;
    try {
      const pay = await Payment.create({
        tenant: req.tenant,
        kind: "payment",
        status: "pending",
        method: methodMap[paymentMethod],
        provider: paymentMethod === "paypal" ? "paypal" : undefined,
        grossAmount: finalTotal,
        currency: (cart as any).currency || currency,
        receivedAt: new Date(),
        payer: { name: req.user?.name || undefined, email: req.user?.email || undefined },
        metadata: { channel: "menu_cart_checkout", cartId: String(cart._id), orderId: String(order._id) },
      });
      order.payments = [...(order.payments || []), pay._id];
      await order.save();
    } catch (e) {
      logger.withReq.warn(req, "Payment pending record failed at checkout", { error: (e as Error)?.message });
    }
  }

  // sepeti temizle (checkout sonrası)
  cart.items = [];
  cart.totalPrice = 0;
  await cart.save();

  logger.withReq.info(req, cartT("cart.checkout.success", locale, { orderId: String(order._id) }));
  res.status(201).json({ success: true, message: cartT("cart.checkout.success", locale), data: order });
});

