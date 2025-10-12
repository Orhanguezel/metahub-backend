import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { redeemGiftcard } from "./service";

/** GET /giftcards/public?code=...  → bakiye görüntüleme */
export const publicGetByCode = asyncHandler(async (req: Request, res: Response) => {
  const { Giftcard } = await getTenantModels(req);
  const code = String(req.query.code || "").toUpperCase().trim();

  const doc = await Giftcard.findOne({ tenant: req.tenant, code }).lean();
  if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }

  // Expire durumu kontrolü
  const isExpired = !!(doc.expiresAt && new Date(doc.expiresAt).getTime() <= Date.now());
  const status = isExpired ? "expired" : doc.status;

  res.status(200).json({
    success: true,
    data: {
      code: doc.code,
      currency: doc.currency,
      balance_cents: doc.balance_cents,
      status,
      expiresAt: doc.expiresAt,
    },
  });
});

/** POST /giftcards/public/redeem { code, amount_cents, orderId?, note? } */
export const publicRedeem = asyncHandler(async (req, res) => {
  const { Giftcard } = await getTenantModels(req);
  const code = String((req.body as any).code || "").toUpperCase().trim();
  const { amount_cents, orderId, note } = req.body as any;

  const out = await redeemGiftcard({
    Giftcard,
    tenant: req.tenant!,
    code,
    amount_cents: Number(amount_cents),
    orderId,
    note,
  });

  if (!out.ok) {
    const map: Record<string, number> = {
      not_found: 404,
      expired: 409,
      not_active: 409,
      insufficient_balance: 409,
      concurrent_update: 409,
      cannot_topup: 409,
    };
    res.status(map[out.error!] || 400).json({ success: false, message: out.error });return;
  }

  res.status(200).json({ success: true, message: "redeemed", data: out.card });
});

