import type { Model, Types } from "mongoose";
import type { IGiftcard } from "./types";

type IssueArgs = {
  Giftcard: Model<IGiftcard>;
  tenant: string;
  code?: string;
  initialBalance_cents: number;
  currency: string;
  expiresAt?: Date;
};

type RedeemArgs = {
  Giftcard: Model<IGiftcard>;
  tenant: string;
  code: string;
  amount_cents: number;
  orderId?: string | Types.ObjectId;
  note?: string;
};

type TopupArgs = {
  Giftcard: Model<IGiftcard>;
  tenant: string;
  id: string | Types.ObjectId;
  amount_cents: number;
  note?: string;
};

export async function issueGiftcard(args: IssueArgs) {
  const { Giftcard, tenant, code, initialBalance_cents, currency, expiresAt } = args;
  const doc = await Giftcard.create({
    tenant,
    code,
    initialBalance_cents,
    balance_cents: initialBalance_cents,
    currency: currency.toUpperCase(),
    status: "active",
    expiresAt,
    txns: initialBalance_cents > 0 ? [{ at: new Date(), amount_cents: initialBalance_cents, note: "issue" }] : [],
  });
  return doc.toObject();
}

// service.ts
export async function redeemGiftcard(args: RedeemArgs) {
  const { Giftcard, tenant, code, amount_cents, orderId, note } = args;
  const c = String(code).toUpperCase().trim();

  const card = await Giftcard.findOne({ tenant, code: c });
  if (!card) return { ok: false, error: "not_found" };

  // ÖNCE expire kontrolü
  if (card.expiresAt && card.expiresAt.getTime() <= Date.now()) {
    return { ok: false, error: "expired" };
  }

  if (card.status !== "active") return { ok: false, error: "not_active" };
  if (card.balance_cents < amount_cents) return { ok: false, error: "insufficient_balance" };

  await Giftcard.updateOne(
    { _id: card._id, tenant, balance_cents: { $gte: amount_cents }, status: "active" },
    {
      $inc: { balance_cents: -amount_cents },
      $push: { txns: { at: new Date(), order: orderId, amount_cents: -amount_cents, note: note || "redeem" } },
    }
  );

  const updated = await Giftcard.findById(card._id);
  if (!updated) return { ok: false, error: "concurrent_update" };

  if (updated.balance_cents <= 0 && updated.status === "active") {
    updated.status = "redeemed";
    await updated.save();
  }

  return { ok: true, card: updated.toObject() };
}


export async function topupGiftcard(args: TopupArgs) {
  const { Giftcard, tenant, id, amount_cents, note } = args;
  const card = await Giftcard.findOne({ _id: id, tenant });
  if (!card) return { ok: false, error: "not_found" };
  if (card.status === "disabled" || card.status === "expired") return { ok: false, error: "cannot_topup" };

  await Giftcard.updateOne(
    { _id: card._id, tenant },
    {
      $inc: { balance_cents: amount_cents },
      $push: { txns: { at: new Date(), amount_cents, note: note || "topup" } },
      $set: { status: "active" },
    }
  );

  const updated = await Giftcard.findById(card._id);
  return { ok: true, card: updated!.toObject() };
}
