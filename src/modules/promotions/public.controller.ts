import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { isValidObjectId } from "@/core/middleware/auth/validation";
import type { SupportedLocale } from "@/types/common";
import type { IPromotion, ICartSnapshot, ICartItemInput } from "./types";

/* ===== helpers ===== */

const tByReq = (req: Request) => (k: string, vars?: Record<string, any>) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, vars);

const now = () => new Date();

function inWindow(p: IPromotion): boolean {
  const s = p.rules?.startsAt ? new Date(p.rules.startsAt) : null;
  const e = p.rules?.endsAt ? new Date(p.rules.endsAt) : null;
  const n = now().getTime();
  if (s && n < s.getTime()) return false;
  if (e && n > e.getTime()) return false;
  return true;
}

function cartSubtotal(cart: ICartSnapshot) {
  return Number(cart?.subtotal || 0);
}

function itemMatchesScope(item: ICartItemInput, p: IPromotion): boolean {
  const sc = p.rules?.scope || {};
  if (!sc.itemIds && !sc.categoryIds) return true;
  const okItem =
    (sc.itemIds || []).some((x: any) => String(x) === String(item.itemId)) ||
    (sc.categoryIds || []).some((x: any) => String(x) === String(item.categoryId));
  return !!okItem;
}

function cartMatchesScope(cart: ICartSnapshot, p: IPromotion): boolean {
  const sc = p.rules?.scope || {};
  if (sc.serviceTypes && cart.serviceType && !sc.serviceTypes.includes(cart.serviceType)) return false;
  if (sc.branchIds && cart.branchId && !sc.branchIds.map(String).includes(String(cart.branchId))) return false;
  // item/category kapsamı varsa: en az 1 satır eşleşmeli
  if ((sc.itemIds && sc.itemIds.length) || (sc.categoryIds && sc.categoryIds.length)) {
    if (!cart.items?.some((it) => itemMatchesScope(it, p))) return false;
  }
  return true;
}

/* basit firstOrder kontrolü (Order sayımına bakar) */
async function isFirstOrder(req: Request, userId?: string): Promise<boolean> {
  if (!userId) return false;
  const { Order } = await getTenantModels(req);
  const count = await Order.countDocuments({ tenant: req.tenant, user: userId });
  return count === 0;
}

/* limit kontrol */
async function checkLimits(
  req: Request,
  promo: IPromotion,
  userId?: string
): Promise<{ ok: boolean; reason?: "limit" | "perUser" }> {
  const { PromotionRedemption } = await getTenantModels(req);

  if (promo.rules?.usageLimit != null) {
    const total = await PromotionRedemption.countDocuments({ tenant: req.tenant, promotion: promo._id });
    if (total >= promo.rules.usageLimit) return { ok: false, reason: "limit" };
  }
  if (userId && promo.rules?.perUserLimit != null) {
    const u = await PromotionRedemption.countDocuments({ tenant: req.tenant, promotion: promo._id, user: userId });
    if (u >= promo.rules.perUserLimit) return { ok: false, reason: "perUser" };
  }
  return { ok: true };
}

/* indirim hesaplama */
function computeDiscount(
  p: IPromotion,
  cart: ICartSnapshot
): { amount: number; freeDelivery?: boolean; details?: any } {
  const subtotal = cartSubtotal(cart);
  const eligibleItems = cart.items?.filter((it) => itemMatchesScope(it, p)) || [];

  if (p.effect.type === "percentage") {
    const pct = Math.max(0, Math.min(100, Number(p.effect.value || 0)));
    return { amount: Math.floor((subtotal * pct) / 100) };
  }

  if (p.effect.type === "fixed") {
    const amt = Math.max(0, Number(p.effect.value || 0));
    return { amount: Math.min(amt, subtotal) };
  }

  if (p.effect.type === "free_delivery") {
    const df = Math.max(0, Number(cart.deliveryFee || 0));
    return { amount: df, freeDelivery: true };
  }

  if (p.effect.type === "bxgy") {
    const bxg = p.effect.bxgy!;
    const qtySum = eligibleItems.reduce((s, it) => s + it.quantity, 0);
    const group = bxg.buyQty + bxg.getQty;
    if (group <= 0 || qtySum < group) return { amount: 0 };
    const times = Math.floor(qtySum / group);
    const freeUnits = times * bxg.getQty;
    // en ucuz uygun satırın birim fiyatı bedava
    const cheapest = eligibleItems.reduce((min, it) => Math.min(min, it.unitPrice), Infinity);
    const amount = Math.floor((isFinite(cheapest) ? cheapest : 0) * freeUnits);
    return { amount: Math.min(amount, subtotal) };
  }

  return { amount: 0 };
}

/* ===== PUBLIC: evaluate ===== */
export const evaluatePromotions = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Promotion } = await getTenantModels(req);
  const cart = req.body.cart as ICartSnapshot;

  const currency = cart.currency || "TRY";
  const minOrderOk = (p: IPromotion) =>
    p.rules?.minOrder?.amount == null || cartSubtotal(cart) >= Number(p.rules.minOrder.amount || 0);

  const list = await Promotion.find({
    tenant: req.tenant,
    isActive: true,
    isPublished: true,
  })
    .sort({ priority: -1, createdAt: -1 })
    .lean<IPromotion[]>();

  const applicable: any[] = [];
  for (const p of list) {
    if (!inWindow(p)) continue;
    if (!cartMatchesScope(cart, p)) continue;
    if (!minOrderOk(p)) continue;

    // first order
    if (p.rules?.firstOrderOnly && !(await isFirstOrder(req, cart.userId))) continue;

    const { ok } = await checkLimits(req, p, cart.userId);
    if (!ok) continue;

    const disc = computeDiscount(p, cart);
    if (disc.amount <= 0) continue;

    applicable.push({
      _id: p._id,
      code: p.code,
      name: p.name,
      stackingPolicy: p.stackingPolicy,
      priority: p.priority,
      effect: p.effect,
      discount: { amount: disc.amount, currency, freeDelivery: !!disc.freeDelivery },
    });
  }

  if (!applicable.length) {
    res.status(200).json({ success: true, message: t("evalNoMatch"), data: [] });
    return;
  }

  res.status(200).json({ success: true, message: t("evalApplied"), data: applicable });
});

/* ===== PUBLIC: redeem (idempotent) ===== */
export const redeemPromotion = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Promotion, PromotionRedemption } = await getTenantModels(req);

  const { promotionId, orderId, userId, amount, currency } = req.body as {
    promotionId: string;
    orderId: string;
    userId?: string;
    amount?: number;
    currency?: string;
  };

  if (!isValidObjectId(promotionId) || !isValidObjectId(orderId)) {
    res.status(400).json({ success: false, message: t("invalidObjectId") });
    return;
  }

  const promo = await Promotion.findOne({ _id: promotionId, tenant: req.tenant });
  if (!promo) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }
  if (!promo.isActive || !promo.isPublished || !inWindow(promo)) {
    res.status(400).json({ success: false, message: t("notPublished") });
    return;
  }

  // limitler
  if (promo.rules?.firstOrderOnly && !(await isFirstOrder(req, userId))) {
    res.status(400).json({ success: false, message: t("redeemFirstOrderOnly") });
    return;
  }
  const lim = await checkLimits(req, promo, userId);
  if (!lim.ok) {
    const key = lim.reason === "perUser" ? "redeemPerUserLimit" : "redeemLimitReached";
    res.status(400).json({ success: false, message: t(key) });
    return;
  }

  try {
    const doc = await PromotionRedemption.create({
      tenant: req.tenant,
      promotion: promo._id,
      user: userId,
      orderId,
      amount: Number(amount || 0),
      currency: currency || "TRY",
    });

    res.status(201).json({ success: true, message: t("redeemOk"), data: doc.toJSON() });
  } catch (e: any) {
    // idempotent: unique violation (tenant+promotion+orderId)
    if (e?.code === 11000) {
      const exist = await PromotionRedemption.findOne({
        tenant: req.tenant,
        promotion: promo._id,
        orderId,
      }).lean();
      res.status(200).json({ success: true, message: t("redeemDuplicate"), data: exist });
      return;
    }
    throw e;
  }
});
