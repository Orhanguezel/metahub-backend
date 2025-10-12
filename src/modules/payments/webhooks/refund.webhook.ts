import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

export type RefundWebhookPayload = {
  provider: string;
  /** Sağlayıcının refund id'si (örn: Stripe refund.id). */
  providerRefundId?: string;
  /** Sağlayıcının payment referansı (örn: payment_intent / transaction id). */
  paymentProviderRef?: string;
  status: "succeeded" | "failed";
  raw: any;
};

/**
 * Refund webhook işleyici:
 * - Önce providerRefundId ile eşleşme dener
 * - Bulunamazsa paymentProviderRef + pending eşleşmesi dener
 * - ReturnRMA timeline'a bilgilendirme push eder
 */
export async function processRefundWebhook(
  req: any,
  payload: RefundWebhookPayload
): Promise<void> {
  const { Refund, ReturnRMA } = await getTenantModels(req);

  let ref =
    payload.providerRefundId
      ? await Refund.findOneAndUpdate(
          {
            tenant: req.tenant,
            provider: payload.provider,
            providerRefundId: payload.providerRefundId,
          },
          { $set: { status: payload.status, raw: payload.raw } },
          { new: true }
        )
      : null;

  // Fallback: paymentProviderRef + pending kayıt
  if (!ref && payload.paymentProviderRef) {
    ref = await Refund.findOneAndUpdate(
      {
        tenant: req.tenant,
        provider: payload.provider,
        paymentProviderRef: payload.paymentProviderRef,
        status: "pending",
      },
      {
        $set: {
          status: payload.status,
          ...(payload.providerRefundId
            ? { providerRefundId: payload.providerRefundId }
            : {}),
          raw: payload.raw,
        },
      },
      { new: true }
    );
  }

  if (ref) {
    await ReturnRMA.updateMany(
      { tenant: req.tenant, order: ref.order },
      {
        $push: {
          timeline: {
            at: new Date(),
            status: "refunded",
            note: `provider:${payload.provider} #${
              payload.providerRefundId ||
              payload.paymentProviderRef ||
              "n/a"
            }`,
          },
        },
      }
    );
  }
}
