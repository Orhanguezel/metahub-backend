import type { Model } from "mongoose";
import type {
  PricingInput,
  PricingOutput,
  PricingItemInput,
  FeeApplied,
} from "./types";
import type { IShippingMethod } from "@/modules/shipping/types";
import type { IFeeRule } from "@/modules/fees/fee.model";
import type { ICoupon } from "@/modules/coupon/types";
import { resolveTaxRate, calcTaxCents } from "@/modules/tax/tax.service";

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const roundCents = (n: number) => Math.round(n);

function unitPrice(it: PricingItemInput) {
  const u = Number(it.offer_price_cents ?? it.price_cents);
  return Math.max(0, roundCents(u));
}

function ensureSingleCurrency(items: PricingItemInput[], expected: string) {
  const exp = String(expected || "").toUpperCase();
  for (const it of items) {
    if (String(it.currency || "").toUpperCase() !== exp) {
      throw new Error("currency_mismatch");
    }
  }
}

function mapToObject(m: any): Record<string, string> {
  if (!m) return {};
  if (m instanceof Map) return Object.fromEntries(m);
  if (typeof m === "object") return m as Record<string, string>;
  return {};
}

async function pickShippingPriceCents(params: {
  ShippingMethod: Model<IShippingMethod>;
  tenant: string;
  code: string;
  currency: string;
  subtotal_cents: number;
  weight_grams?: number;
  freeShippingOverride?: boolean;
}) {
  const { ShippingMethod, tenant, code, currency, subtotal_cents, weight_grams, freeShippingOverride } = params;
  const sm = await ShippingMethod.findOne({ tenant, code, active: true }).lean<IShippingMethod>();
  if (!sm) throw new Error("shipping_method_not_found");

  // MVP: FX yok
  if (String(sm.currency).toUpperCase() !== String(currency).toUpperCase()) {
    throw new Error("shipping_currency_mismatch");
  }

  if (freeShippingOverride) {
    return { price_cents: 0, method: sm };
  }

  if (sm.calc === "flat") {
    return { price_cents: Math.max(0, Number(sm.flatPrice_cents || 0)), method: sm };
  }

  if (sm.calc === "free_over") {
    const freeOver = Number(sm.freeOver_cents || 0);
    if (subtotal_cents >= freeOver) return { price_cents: 0, method: sm };
    const base = Math.max(0, Number(sm.flatPrice_cents || 0));
    return { price_cents: base, method: sm };
  }

  // table
  const rows = sm.table || [];
  const W = Number(weight_grams || 0);
  const S = subtotal_cents;
  const candidates = rows.filter((r) => {
    const wOk = (r.minWeight == null || W >= r.minWeight) && (r.maxWeight == null || W <= r.maxWeight);
    const sOk =
      (r.minSubtotal_cents == null || S >= r.minSubtotal_cents) &&
      (r.maxSubtotal_cents == null || S <= r.maxSubtotal_cents);
    return wOk && sOk;
  });
  const price_cents =
    candidates.length > 0
      ? candidates.map((c) => Number(c.price_cents || 0)).sort((a, b) => a - b)[0]
      : Math.max(0, Number(sm.flatPrice_cents || 0));
  return { price_cents, method: sm };
}

/** Sizin kupon şemanıza uyumlu tek tip (percent) indirim */
function applyCouponPercentOnly(subtotal_cents: number, coupon: ICoupon | null) {
  if (!coupon) return { discount_cents: 0, freeShipping: false, snapshot: null as any };
  if (!coupon.isActive) return { discount_cents: 0, freeShipping: false, snapshot: null as any };
  if (coupon.expiresAt && Date.now() > new Date(coupon.expiresAt).getTime()) {
    return { discount_cents: 0, freeShipping: false, snapshot: null as any };
  }

  const pct = clamp(Number(coupon.discount || 0), 0, 100);
  const discount = roundCents((subtotal_cents * pct) / 100);

  return {
    discount_cents: clamp(discount, 0, subtotal_cents),
    freeShipping: false,
    snapshot: { code: coupon.code, type: "percent" as const, value: pct },
  };
}

function shouldApplyFee(
  rule: IFeeRule,
  ctx: {
    feeFlags?: string[];
    shippingMethodCode: string;
    shippingMethodCalc: "flat" | "table" | "free_over";
    subtotal_cents: number;
    freeOver_cents?: number;
  }
) {
  const flags = new Set((ctx.feeFlags || []).map(String));
  const conds = rule.appliesWhen || [];
  if (conds.length === 0) return true;

  for (const c of conds) {
    if (c === "all") return true;
    if (c === "cod" && flags.has("cod")) return true;
    if (c === "express_shipping" && ctx.shippingMethodCode === "express") return true;
    if (c === "below_free_shipping" && ctx.shippingMethodCalc === "free_over") {
      const thr = Number(ctx.freeOver_cents || 0);
      if (ctx.subtotal_cents < thr) return true;
    }
  }
  return false;
}

export async function computePricing(
  models: {
    ShippingMethod: Model<IShippingMethod>;
    FeeRule: Model<IFeeRule>;
    Coupon: Model<ICoupon>;
  },
  input: PricingInput
): Promise<PricingOutput> {
  const {
    tenant,
    items,
    shippingMethodCode,
    shippingAddress,
    couponCode,
    feeFlags,
    currency,
    weight_grams_override,
  } = input;

  if (!items || items.length === 0) throw new Error("items_required");
  ensureSingleCurrency(items, currency);

  // 1) Satırlar
  const lines = items.map((it) => {
    const unit = unitPrice(it);
    const qty = Math.max(1, Number(it.qty || 1));
    return {
      productId: it.productId,
      variantId: it.variantId,
      qty,
      unit_cents: unit,
      line_total_cents: unit * qty,
      currency,
      title: it.title,
      image: it.image,
      attributes: it.attributes,
    };
  });
  const subtotal_cents = lines.reduce((s, l) => s + l.line_total_cents, 0);

  // 2) Kupon
  let coupon: ICoupon | null = null;
  if (couponCode) {
    coupon = await models.Coupon.findOne({
      tenant,
      code: String(couponCode).toUpperCase().trim(),
      isActive: true,
    }).lean<ICoupon>();
  }
  const couponRes = applyCouponPercentOnly(subtotal_cents, coupon);
  const discount_cents = couponRes.discount_cents;

  // 3) Kargo
  const totalWeight = Number(
    weight_grams_override ??
      items.reduce(
        (w, it) => w + Number(it.weight_grams || 0) * Math.max(1, Number(it.qty || 1)),
        0
      )
  );
  const ship = await pickShippingPriceCents({
    ShippingMethod: models.ShippingMethod,
    tenant,
    code: shippingMethodCode,
    currency,
    subtotal_cents,
    weight_grams: totalWeight,
    freeShippingOverride: couponRes.freeShipping,
  });
  const shipping_cents = Math.max(0, Number(ship.price_cents || 0));

  // 4) Fees
  const feeRules = await models.FeeRule.find({ tenant, isActive: true }).lean<IFeeRule[]>();
  const feesApplied: FeeApplied[] = [];
  for (const r of feeRules) {
    const ok = shouldApplyFee(r, {
      feeFlags,
      shippingMethodCode,
      shippingMethodCalc: ship.method.calc,
      subtotal_cents,
      freeOver_cents: (ship.method as any).freeOver_cents,
    });
    if (!ok) continue;

    let amount = 0;
    if (r.mode === "fixed") {
      amount = Math.max(0, Number(r.amount || 0));
    } else {
      const baseForPercent = Math.max(0, subtotal_cents - discount_cents + shipping_cents);
      const pct = clamp(Number(r.percent || 0), 0, 1); // modeliniz: 0..1
      amount = roundCents(baseForPercent * pct);
    }
    if (r.min_cents != null) amount = Math.max(amount, Number(r.min_cents));
    if (r.max_cents != null) amount = Math.min(amount, Number(r.max_cents));
    if (amount <= 0) continue;

    feesApplied.push({
      code: r.code,
      name: mapToObject(r.name as any),
      amount_cents: amount,
      currency: r.currency,
    });
  }
  const feesTotal_cents = feesApplied.reduce(
    (s, f) =>
      s +
      (String(f.currency).toUpperCase() === String(currency).toUpperCase()
        ? f.amount_cents
        : 0),
    0
  );

  // 5) Vergi
  const taxRule = await resolveTaxRate(
    tenant,
    {
      country: shippingAddress.country,
      state: shippingAddress.state,
      city: shippingAddress.city,
      postal: shippingAddress.postal,
    },
    "standard",
    new Date()
  );

  const baseBeforeTax_cents = Math.max(
    0,
    subtotal_cents - discount_cents + shipping_cents + feesTotal_cents
  );

  let tax_cents = 0;
  let total_cents = baseBeforeTax_cents;
  let taxSnapshot: { id?: string; rate: number; inclusive: boolean } | undefined;

  if (taxRule) {
    const r: any = taxRule as any;

    // 0..100 bekleniyor, 0..1 ise %'ye çevir
    let ratePct: number = Number(
      r.ratePct ?? r.percent ?? r.rate ?? r.value ?? 0
    );
    if (ratePct <= 1) ratePct = ratePct * 100;

    const isInclusive: boolean = !!(r.isInclusive ?? r.inclusive);

    const taxRes = calcTaxCents(baseBeforeTax_cents, ratePct, isInclusive);
    tax_cents = Math.max(0, Number(taxRes.tax_cents || 0));
    total_cents = isInclusive ? baseBeforeTax_cents : baseBeforeTax_cents + tax_cents;

    taxSnapshot = {
      id: r._id ? String(r._id) : undefined,
      rate: ratePct / 100,          // snapshot: 0..1 olarak saklıyoruz
      inclusive: isInclusive,
    };
  }

  return {
    lines,
    subtotal_cents,
    discount_cents,
    shipping: { code: shippingMethodCode, price_cents: shipping_cents, currency },
    fees: feesApplied,
    tax_cents,
    total_cents,
    snapshots: {
      tax: taxSnapshot,
      coupon: couponRes.snapshot, // { code, type:"percent", value } | null
      shippingMethod: ship.method
        ? {
            id: (ship.method as any)._id
              ? String((ship.method as any)._id)
              : undefined,
            code: ship.method.code,
            calc: ship.method.calc,
          }
        : undefined,
      fees: feesApplied.map((f) => f.code),
    },
  };
}
