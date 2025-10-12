import type { Request } from "express";
import type { IReturnRMA } from "./types";

/**
 * Sipariş satırından KURUŞ (minor) cinsinden birim fiyatı hesapla.
 * Öncelik: totalPriceAtAddition / quantity  → yoksa unitPrice
 */
function unitPriceCentsOf(orderItem: any): number {
  const qty = Number(orderItem?.quantity || 0);
  const totalMajor = Number(orderItem?.totalPriceAtAddition || 0);
  const unitMajor =
    qty > 0 && totalMajor > 0 ? totalMajor / qty : Number(orderItem?.unitPrice || 0);
  return Math.round(unitMajor * 100);
}

/**
 * RMA satırlarına göre iade tutarını (minor unit) hesapla.
 * (Kargo/servis ücretini içermez; yalnızca ürün kalemleri)
 */
export function computeRefundAmountCents(args: {
  order: any;
  rma: IReturnRMA;
}): { amount_cents: number; currency: string } {
  const currency = String(args.order?.currency || "TRY").toUpperCase();

  let acc = 0;
  const items = Array.isArray(args.order?.items) ? args.order.items : [];
  for (const line of args.rma.lines || []) {
    const it = items[line.itemIndex];
    if (!it) continue;
    const unitCents = unitPriceCentsOf(it);
    const qty = Math.max(0, Number(line.qty || 0));
    acc += unitCents * qty;
  }
  return { amount_cents: Math.max(0, acc), currency };
}

/**
 * İade edilen kalemleri stoğa geri koy (idempotent).
 * Idempotency: Stockledger’da (ref: rma._id, type: 'return') kayıt varsa NO-OP.
 */
export async function restockInventoryForRMA(req: Request, rma: IReturnRMA): Promise<{
  restocked: boolean;
  entries?: Array<{ product: string; qty: number }>;
}> {
  const { Stockledger, InventoryModel, Order } =
    await (await import("@/core/middleware/tenant/getTenantModels")).getTenantModels(req);

  const order = await Order.findOne({ _id: rma.order, tenant: req.tenant }).lean();
  if (!order) return { restocked: false };

  // Zaten ledger girişi yapılmış mı?
  const exists = await Stockledger.findOne({
    tenant: req.tenant,
    refType: "return",
    refId: rma._id,
    type: { $in: ["return", "in"] },
  }).lean();

  if (exists) return { restocked: false }; // idempotent

  const items = Array.isArray(order.items) ? order.items : [];
  const ops: Array<{ product: any; qty: number }> = [];

  for (const line of rma.lines || []) {
    const it = items[line.itemIndex];
    if (!it) continue;
    const product = it.product;
    const qty = Math.max(0, Number(line.qty || 0));
    if (!qty) continue;

    // Ledger: return (+qty)
    await Stockledger.create({
      tenant: req.tenant,
      productId: product,
      type: "return",               // muhasebe tipi
      qty,                          // + qty
      refType: "return",
      refId: rma._id,
      note: `RMA ${rma.code}`,
      createdAt: new Date(),
    });

    // Inventory: onHand += qty
    const inv =
      (await InventoryModel.findOne({ tenant: req.tenant, product })) ||
      (await InventoryModel.create({ tenant: req.tenant, product, onHand: 0, reserved: 0, available: 0 }));

    inv.onHand = Math.max(0, Number(inv.onHand || 0)) + qty;
    await inv.save();

    ops.push({ product: String(product), qty });
  }

  return { restocked: true, entries: ops };
}

/**
 * Son başarılı ödemeyi bul (provider & providerRef için).
 */
async function findLatestConfirmedPayment(req: Request, orderId: any) {
  const { Payment } =
    await (await import("@/core/middleware/tenant/getTenantModels")).getTenantModels(req);
  const pay = await Payment.findOne({
    tenant: req.tenant,
    "links.order": orderId,
    status: "confirmed",
  })
    .sort({ receivedAt: -1 })
    .lean();
  return pay; // { provider, providerRef, currency, grossAmount ... }
}

/**
 * Sağlayıcıya refund isteği gönder + Refund dokümanı oluştur/güncelle.
 * - amount_cents minor unit
 * - Idempotency: aynı (tenant, order, amount_cents, providerRef, reason) için son 24 saatte varsa NO-OP
 */
export async function createAndTriggerRefund(req: Request, args: {
  order: any;
  rma: IReturnRMA;
  amount_cents: number;
  currency: string;
  reason?: string;
}): Promise<{
  created: boolean;
  refundId?: string;
  status: "pending" | "succeeded" | "failed";
  provider?: string;
  providerRefundId?: string;
}> {
  const { Refund, PaymentGateway } =
    await (await import("@/core/middleware/tenant/getTenantModels")).getTenantModels(req);

  const payment = await findLatestConfirmedPayment(req, args.order._id);
  if (!payment) {
    // ödeme bulunamadı → sadece Refund kaydı "pending" (manuel işleme)
    const doc = await Refund.create({
      tenant: req.tenant,
      order: args.order._id,
      orderNo: args.order.orderNo,
      provider: "manual",
      status: "pending",
      amount_cents: args.amount_cents,
      currency: args.currency,
      reason: args.reason || `RMA ${args.rma.code}`,
    });
    return { created: true, refundId: String(doc._id), status: "pending" };
  }

  const provider = String(payment.provider).toLowerCase();

  // Idempotency (24h): aynı parametrelerle kayıt var mı?
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dup = await Refund.findOne({
    tenant: req.tenant,
    order: args.order._id,
    provider,
    paymentProviderRef: payment.providerRef,
    amount_cents: args.amount_cents,
    createdAt: { $gte: since },
  }).lean();
  if (dup) {
    return {
      created: false,
      refundId: String(dup._id),
      status: dup.status,
      provider: dup.provider,
      providerRefundId: dup.providerRefundId,
    };
  }

  // Gateway config
  const gw = await PaymentGateway.findOne({ tenant: req.tenant, provider, isActive: true }).lean();

  // Refund kaydını PENDING aç
  const refDoc = await Refund.create({
    tenant: req.tenant,
    order: args.order._id,
    orderNo: args.order.orderNo,
    provider,
    status: "pending",
    amount_cents: args.amount_cents,
    currency: args.currency,
    reason: args.reason || `RMA ${args.rma.code}`,
    paymentProviderRef: payment.providerRef,
  });

  // Sağlayıcıya çağrı (varsa)
  if (gw) {
    try {
      const { getAdapter, normalizeCreds } = await import("@/modules/payments/gateway");
      const adapter = getAdapter(provider as any);
      const out = await adapter.refund({
        tenant: req.tenant!,
        provider: provider as any,
        providerRef: payment.providerRef,
        amount: args.amount_cents,
        reason: args.reason || `RMA ${args.rma.code}`,
        credentials: normalizeCreds((gw as any).credentials),
      });

      // sonucunu yansıt
      refDoc.status = out.ok ? "succeeded" : "failed";
      if (out.refundRef) refDoc.providerRefundId = out.refundRef;   // <— standard field
      (refDoc as any).raw = out;
      await refDoc.save();

      return {
        created: true,
        refundId: String(refDoc._id),
        status: refDoc.status,
        provider,
        providerRefundId: refDoc.providerRefundId,
      };
    } catch (e: any) {
      // sağlayıcı hatası → pending kaydı kalsın, raw’a yaz
      (refDoc as any).raw = { error: e?.message || "refund_failed" };
      await refDoc.save();
      return { created: true, refundId: String(refDoc._id), status: "pending", provider };
    }
  }

  // gateway yoksa manuel beklet
  return { created: true, refundId: String(refDoc._id), status: "pending", provider };
}

/**
 * Yüksek seviye akış:
 * - APPROVED olduğunda: restock + (ops.) autoRefund
 * - REJECTED: sadece timeline
 * - REFUNDED: sadece kapanış kontrolü
 */
export async function onRMAStatusChange(req: Request, args: {
  rma: IReturnRMA;
  next: "approved" | "rejected" | "received" | "refunded" | "closed";
  autoRefund?: boolean;
  refundReason?: string;
}): Promise<{
  restocked?: boolean;
  refund?: { status: "pending" | "succeeded" | "failed"; refundId?: string };
}> {
  const { Order, ReturnRMA } =
    await (await import("@/core/middleware/tenant/getTenantModels")).getTenantModels(req);

  const rma = args.rma;
  const next = args.next;

  // Order fetch
  const order = await Order.findOne({ _id: rma.order, tenant: req.tenant }).lean();
  if (!order) return {};

  if (next === "approved") {
    // 1) Restock
    const rs = await restockInventoryForRMA(req, rma);

    // 2) (ops) Auto refund
    if (args.autoRefund) {
      const { amount_cents, currency } = computeRefundAmountCents({ order, rma });
      const rf = await createAndTriggerRefund(req, {
        order,
        rma,
        amount_cents,
        currency,
        reason: args.refundReason || `RMA ${rma.code}`,
      });

      // Bilgilendirici timeline push (otomatik 'refunded' state'e geçirmiyoruz)
      await ReturnRMA.updateOne(
        { _id: rma._id, tenant: req.tenant },
        {
          $push: {
            timeline: {
              at: new Date(),
              status: "refunded",
              note: `refund ${rf.status}${rf.refundId ? ` (#${rf.refundId})` : ""}`,
            },
          },
        }
      );

      return { restocked: !!rs.restocked, refund: { status: rf.status, refundId: rf.refundId } };
    }

    return { restocked: !!rs.restocked };
  }

  // received/rejected/refunded/closed için ekstra işlem gerekmiyor
  return {};
}
