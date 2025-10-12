import type { Model, Types } from "mongoose";
import { Types as MTypes, isValidObjectId } from "mongoose";
import type { ILoyaltyLedger, BalanceSummary } from "./types";

type BalanceArgs = {
  LoyaltyLedger: Model<ILoyaltyLedger>;
  tenant: string;
  userId: string | Types.ObjectId;
  at?: Date; // default now
};

// küçük yardımcı
function toObjectId(id: string | Types.ObjectId): Types.ObjectId | null {
  if (id instanceof MTypes.ObjectId) return id;
  if (typeof id === "string" && isValidObjectId(id)) return new MTypes.ObjectId(id);
  return null;
}

export async function computeBalance({
  LoyaltyLedger,
  tenant,
  userId,
  at = new Date(),
}: BalanceArgs): Promise<BalanceSummary> {
  const userObjId = toObjectId(userId);
  if (!userObjId) {
    // güvenli fallback – invalid id gelirse boş özet döndür
    return { balance: 0, totalEarned: 0, totalSpent: 0 };
  }

  const [aggActive, aggTotals] = await Promise.all([
    // aktif (süresi dolmamış) bakiyeyi hesapla
    LoyaltyLedger.aggregate([
      {
        $match: {
          tenant,
          user: userObjId,
          $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gte: at } }],
        },
      },
      { $group: { _id: null, sum: { $sum: "$points" } } },
      { $project: { _id: 0, sum: 1 } },
    ]),
    // toplam kazanım ve harcamayı hesapla
    LoyaltyLedger.aggregate([
      { $match: { tenant, user: userObjId } },
      {
        $group: {
          _id: null,
          earned: { $sum: { $cond: [{ $gt: ["$points", 0] }, "$points", 0] } },
          spent:  { $sum: { $cond: [{ $lt: ["$points", 0] }, "$points", 0] } },
        },
      },
      { $project: { _id: 0, earned: 1, spent: 1 } },
    ]),
  ]);

  const balance = Number(aggActive?.[0]?.sum || 0);
  const totalEarned = Number(aggTotals?.[0]?.earned || 0);
  const totalSpentAbs = Math.abs(Number(aggTotals?.[0]?.spent || 0));

  return { balance, totalEarned, totalSpent: totalSpentAbs };
}

type AdjustArgs = {
  LoyaltyLedger: Model<ILoyaltyLedger>;
  tenant: string;
  user: string | Types.ObjectId;
  points: number; // +/- (0 değil)
  reason?: string;
  order?: string | Types.ObjectId;
  expiresAt?: Date;
};

export async function addLedgerEntry(args: AdjustArgs) {
  const { LoyaltyLedger, tenant, user, points, reason, order, expiresAt } = args;
  const doc = await LoyaltyLedger.create({
    tenant,
    user,
    points,
    reason: reason || (points >= 0 ? "adjust" : "spend"),
    order,
    expiresAt,
  });
  return doc.toObject();
}

type SpendArgs = {
  LoyaltyLedger: Model<ILoyaltyLedger>;
  tenant: string;
  user: string | Types.ObjectId;
  amount: number; // positive amount to spend
  reason?: string;
  order?: string | Types.ObjectId;
};

/** Harcama: mevcut aktif bakiyeye göre sınırla */
export async function spendPoints(args: SpendArgs) {
  const { LoyaltyLedger, tenant, user, amount, reason, order } = args;

  const { balance } = await computeBalance({ LoyaltyLedger, tenant, userId: user });
  if (amount > balance) {
    return { ok: false, error: "insufficient_balance", balance };
  }

  const entry = await addLedgerEntry({
    LoyaltyLedger,
    tenant,
    user,
    points: -Math.abs(amount),
    reason: reason || "spend",
    order,
  });

  const newBalance = (await computeBalance({ LoyaltyLedger, tenant, userId: user })).balance;
  return { ok: true, entry, balance: newBalance };
}
