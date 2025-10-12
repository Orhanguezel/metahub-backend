import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { resolveTaxRate, calcTaxCents } from "@/modules/tax/tax.service";
import { isValidObjectId } from "@/core/middleware/auth/validation";
import { getAdapter, normalizeCreds } from "@/modules/payments/gateway";
import type { PaymentProvider } from "@/modules/payments/types/gateway.types";

// Helpers
const asInt = (v: any, d = 0) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : d);
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

type ItemInput = {
  productId: string;
  variantId?: string;
  qty: number;
};

export const createCheckout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const tenantModels = await getTenantModels(req);
  const { Product, Coupon, PaymentGateway } = tenantModels as any;

  // ❗ Intent ve Variant modelleri tenant'tan çekilir (doğrudan import YOK)
  const PaymentIntent = (tenantModels as any).PaymentIntent;
  const VariantModel: any = (tenantModels as any).ProductVariant || (tenantModels as any).Variant;

  const {
    items,                       // [{productId, variantId?, qty}]
    shippingAddress,
    billingAddress,
    email, phone,
    currency = "TRY",
    couponCode,
    shippingMethod = "standard",
    shippingFeeCents,            // override (ops)
    createPaymentIntent = false,
    provider,                    // "iyzico" | "paytr" | "stripe" ...
    returnUrl, cancelUrl
  } = req.body as {
    items: ItemInput[];
    shippingAddress?: any;
    billingAddress?: any;
    email?: string; phone?: string;
    currency?: string;
    couponCode?: string;
    shippingMethod?: string;
    shippingFeeCents?: number;
    createPaymentIntent?: boolean;
    provider?: PaymentProvider;
    returnUrl?: string; cancelUrl?: string;
  };

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ success: false, message: "items_required" }); return;
  }

  const cur = String(currency || "TRY").toUpperCase();

  // 1) Satır fiyatları
  const orderItems: Array<{
    product: any;
    variant?: any;
    sku?: string;
    title?: string;
    image?: string;
    attributes?: Record<string, string>;
    qty: number;
    unit_price_cents: number;
    currency: string;
    line_total_cents: number;
  }> = [];

  let subtotal = 0;

  for (const it of items) {
    if (!isValidObjectId(it.productId) || !(asInt(it.qty) > 0)) {
      res.status(400).json({ success: false, message: "invalid_item" }); return;
    }

    const p = await Product.findOne({ _id: it.productId, tenant: req.tenant }).lean();
    if (!p) { res.status(404).json({ success: false, message: "product_not_found" }); return; }

    let unit = asInt(p.offer_price_cents ?? p.price_cents, 0);
    let attrs: Record<string, string> | undefined;
    let sku: string | undefined;
    let image: string | undefined = p.image;

    if (it.variantId) {
      if (!VariantModel) {
        res.status(400).json({ success: false, message: "variant_model_not_available" }); return;
      }
      if (!isValidObjectId(it.variantId)) {
        res.status(400).json({ success: false, message: "invalid_variant" }); return;
      }
      const v = await VariantModel.findOne({ _id: it.variantId, tenant: req.tenant, product: p._id }).lean();
      if (!v) { res.status(404).json({ success: false, message: "variant_not_found" }); return; }
      unit = asInt(v.offer_price_cents ?? v.price_cents, unit);
      attrs = v.options ? Object.fromEntries(Object.entries(v.options)) : undefined;
      sku = v.sku;
      image = v.image || image;
    }

    const line = asInt(unit) * asInt(it.qty);
    subtotal += line;

    orderItems.push({
      product: p._id,
      variant: it.variantId,
      sku,
      title: p.title,
      image,
      attributes: attrs,
      qty: asInt(it.qty),
      unit_price_cents: asInt(unit),
      currency: (p.currency || cur).toUpperCase(),
      line_total_cents: asInt(line),
    });
  }

  // 2) Kupon (yüzde)
  let discount = 0;
  let appliedCoupon: any = null;
  if (couponCode) {
    appliedCoupon = await Coupon.findOne({
      tenant: req.tenant,
      code: String(couponCode).toUpperCase().trim(),
      isActive: true,
      isPublished: true,
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gte: new Date() } }],
    }).lean();
    if (appliedCoupon) {
      const pctRaw = Number(appliedCoupon.discount ?? 0);
      const pct = clamp(Math.round(pctRaw), 0, 100); // ✅ 0–100
      discount = Math.round((subtotal * pct) / 100);
    }
  }

  // 3) Vergi (adres → tax rate)
  const taxRate = await resolveTaxRate(
    req.tenant!,
    {
      country: shippingAddress?.country,
      state: shippingAddress?.state,
      city: shippingAddress?.city,
      postal: shippingAddress?.zip,
    },
    "standard",
    new Date()
  );

  const taxableBase = Math.max(0, subtotal - discount);
  const taxCalc = taxRate
    ? calcTaxCents(taxableBase, taxRate.ratePct, taxRate.isInclusive)
    : { tax_cents: 0, base_ex_tax_cents: taxableBase };

  // 4) Kargo
  const shipping = typeof shippingFeeCents === "number"
    ? Math.max(0, asInt(shippingFeeCents))
    : (shippingMethod === "standard" ? 0 : 0);

  // 5) Toplam
  const total = Math.max(0, asInt(taxCalc.base_ex_tax_cents) + asInt(taxCalc.tax_cents) + asInt(shipping));

  // 6) (Opsiyonel) Payment Intent
  let payment: any = null;
  if (createPaymentIntent) {
    if (!provider) {
      res.status(400).json({ success: false, message: "provider_required_for_payment_intent" }); return;
    }

    // Aktif gateway + credentials
    const gw = await (PaymentGateway as any).findOne({
      tenant: req.tenant,
      provider,
      isActive: true,
    }).lean();
    if (!gw) {
      res.status(400).json({ success: false, message: "payment_gateway_not_configured" }); return;
    }

    const adapter = getAdapter(provider);
    const pName = provider as string;
    const defaultMethod = pName === "papara" || pName === "paycell" ? "wallet" : "card";

    const out = await adapter.createCheckout({
      tenant: req.tenant!,
      provider,
      method: defaultMethod,
      amount: total,
      currency: cur,
      orderId: undefined, // Checkout modülü sipariş yaratmaz; FE mevcut orderId'yi geçebilir
      customer: { name: shippingAddress?.fullName, email, phone },
      items: orderItems.map(i => ({ name: i.title, qty: i.qty, unitAmount: i.unit_price_cents })),
      returnUrl, cancelUrl,
      metadata: { source: "checkout_module" },
      locale: (req as any).locale || "tr-TR",
      credentials: normalizeCreds((gw as any).credentials), // ✅ creds burada sağlanıyor
    });

    const intent = await (tenantModels as any).PaymentIntent.create({
      tenant: req.tenant,
      provider,
      providerRef: out.providerRef,
      method: defaultMethod,
      amount: total,
      currency: cur,
      status: out.hostedUrl ? "requires_action" : "processing",
      clientSecret: out.clientSecret,
      hostedUrl: out.hostedUrl,
      metadata: { source: "checkout_module" },
      createdBy: (req as any).user?._id,
    });

    payment = {
      intentId: String(intent._id),
      providerRef: out.providerRef,
      clientSecret: out.clientSecret,
      hostedUrl: out.hostedUrl,
      status: intent.status,
    };
  }

  res.status(201).json({
    success: true,
    message: "checkout_calculated",
    data: {
      items: orderItems,
      currency: cur,
      summary: {
        subtotal_cents: asInt(subtotal),
        discount_cents: asInt(discount),
        shipping_cents: asInt(shipping),
        tax_cents: asInt(taxCalc.tax_cents),
        total_cents: asInt(total),
        tax_rate_code: taxRate?.code,
        tax_rate_pct: taxRate?.ratePct,
        is_tax_inclusive: taxRate?.isInclusive ?? false,
      },
      customer: { email, phone, shippingAddress, billingAddress },
      payment,
    },
  });
});
