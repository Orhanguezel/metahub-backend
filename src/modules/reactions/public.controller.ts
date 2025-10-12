// src/modules/reactions/public.controller.ts
import type { Request, Response, RequestHandler } from "express";
import asyncHandler from "express-async-handler";
import { Types, isValidObjectId } from "mongoose";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";

/** req.user._id yoksa güvenli şekilde guest id üret */
function ensureActorId(req: Request): string {
  let id = (req as any).user?._id as string | undefined;
  if (!id || !isValidObjectId(id)) {
    id = new Types.ObjectId().toString();
    (req as any).user = { _id: id, isGuest: true };
  }
  return id;
}

/* ---- POST /reactions/toggle ---- */
export const toggleReaction: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { Reaction } = await getTenantModels(req);
  const locale = (req as any).locale || getLogLocale() || "en";
  const t = (k: string) => translate(k, locale, translations);

  const userId = ensureActorId(req);

  const { targetType, targetId, kind } = req.body as {
    targetType: string;
    targetId: string;
    kind: "LIKE" | "FAVORITE" | "BOOKMARK" | "EMOJI";
    emoji?: string | null;
    extra?: Record<string, unknown>;
  };

  const emoji = kind === "EMOJI" ? String(req.body.emoji || "") : null;

  const query = {
    tenant: (req as any).tenant,
    user: new Types.ObjectId(userId),
    targetType,
    targetId: new Types.ObjectId(targetId),
    kind,
    emoji,
  };

  const existing = await Reaction.findOne(query);
  if (existing) {
    await existing.deleteOne();
    logger.withReq.info(req, t("toggled_off"), { ...getRequestContext(req), ...query });
    res.json({ success: true, message: t("toggled_off"), data: { on: false } });
    return;
  }

  const created = await Reaction.create({ ...query, extra: req.body?.extra || {} });
  logger.withReq.info(req, t("toggled_on"), { ...getRequestContext(req), id: created._id });
  res.status(201).json({ success: true, message: t("toggled_on"), data: { on: true } });
});

/* ---- POST /reactions/set  (idempotent) ---- */
export const setReaction: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { Reaction } = await getTenantModels(req);
  const locale = (req as any).locale || getLogLocale() || "en";
  const t = (k: string) => translate(k, locale, translations);

  const userId = ensureActorId(req);

  const { targetType, targetId, kind, on } = req.body as {
    targetType: string;
    targetId: string;
    kind: "LIKE" | "FAVORITE" | "BOOKMARK" | "EMOJI";
    emoji?: string | null;
    on: boolean;
  };

  const emoji = kind === "EMOJI" ? String(req.body.emoji || "") : null;

  const query = {
    tenant: (req as any).tenant,
    user: new Types.ObjectId(userId),
    targetType,
    targetId: new Types.ObjectId(targetId),
    kind,
    emoji,
  };

  const existing = await Reaction.findOne(query);

  if (on && !existing) {
    await Reaction.create({ ...query, extra: req.body?.extra || {} });
    res.status(201).json({ success: true, message: t("toggled_on"), data: { on: true } });
    return;
  }
  if (!on && existing) {
    await existing.deleteOne();
    res.json({ success: true, message: t("toggled_off"), data: { on: false } });
    return;
  }
  // zaten istenen durumda
  res.json({ success: true, message: t("updated"), data: { on } });
});

/* ---- GET /reactions/summary ----
   Query:
    - targetType (string) (zorunlu)
    - targetId (ObjectId) | targetIds (csv)
    - breakdown: "none"|"kind"|"emoji"|"kind+emoji"  (default "kind")
*/
export const getSummary: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { Reaction } = await getTenantModels(req);
  const locale = (req as any).locale || getLogLocale() || "en";
  const t = (k: string) => translate(k, locale, translations);

  const tenant = (req as any).tenant;
  const targetType = String(req.query.targetType);

  // 🔹 Giren değeri normalize et (boşluk/virgül → +)
  const raw = String(req.query.breakdown ?? "kind");
  const norm = raw.replace(/\s+/g, "+").replace(/,/g, "+").toLowerCase();
  const breakdown: "none" | "kind" | "emoji" | "kind+emoji" =
    norm === "none" || norm === "kind" || norm === "emoji"
      ? (norm as any)
      : (norm.includes("kind") && norm.includes("emoji") ? "kind+emoji" : "kind"); // fallback

  const ids: string[] =
    (req.query.targetIds ? String(req.query.targetIds).split(",") : [])
      .concat(req.query.targetId ? [String(req.query.targetId)] : [])
      .filter(Boolean);

  const match: any = { tenant, targetType };
  if (ids.length) match.targetId = { $in: ids.map((s) => new Types.ObjectId(s)) };

  const groupId: any =
    breakdown === "none" ? { targetId: "$targetId" } :
    breakdown === "emoji" ? { targetId: "$targetId", emoji: "$emoji" } :
    breakdown === "kind+emoji" ? { targetId: "$targetId", kind: "$kind", emoji: "$emoji" } :
    { targetId: "$targetId", kind: "$kind" };

  const pipeline = [
    { $match: match },
    { $group: { _id: groupId, count: { $sum: 1 } } },
  ];

  const rows = await Reaction.aggregate(pipeline);

  // Şekillendir
  const result: Record<string, any> = {};
  for (const r of rows) {
    const tid = String(r._id.targetId);
    result[tid] ||= { total: 0, byKind: {}, byEmoji: {} };
    result[tid].total += r.count;

    if (breakdown.includes("kind") && (r._id as any).kind) {
      const k = (r._id as any).kind;
      result[tid].byKind[k] = (result[tid].byKind[k] || 0) + r.count;
    }
    if (breakdown.includes("emoji") && (r._id as any).emoji) {
      const e = (r._id as any).emoji;
      result[tid].byEmoji[e] = (result[tid].byEmoji[e] || 0) + r.count;
    }
  }

  res.json({ success: true, message: t("listed"), data: result });
});

/* ---- GET /reactions/me ----
   Query: targetType, targetIds (csv)
   (Guest destekli: user yoksa boş liste döner)
*/
export const getMyReactions: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { Reaction } = await getTenantModels(req);
  const locale = (req as any).locale || getLogLocale() || "en";
  const t = (k: string) => translate(k, locale, translations);

  const userId: string | undefined = (req as any).user?._id;
  if (!userId || !isValidObjectId(userId)) {
    res.json({ success: true, message: t("fetched"), data: [] });
    return; 
  }

  const tenant = (req as any).tenant;
  const targetType = String(req.query.targetType);
  const ids = String(req.query.targetIds || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const filter: any = { tenant, user: new Types.ObjectId(userId), targetType };
  if (ids.length) filter.targetId = { $in: ids.map((id) => new Types.ObjectId(id)) };

  const items = await Reaction.find(filter).lean();

  res.json({
    success: true,
    message: t("fetched"),
    data: items.map((x) => ({
      targetId: x.targetId,
      kind: x.kind,
      emoji: x.emoji,
      value: x.value, // ⭐ rating desteği
    })),
  });
});

/* ---- POST /reactions/rate ---- */
export const rate: RequestHandler = asyncHandler(async (req, res) => {
  const { Reaction } = await getTenantModels(req);
  const locale = (req as any).locale || getLogLocale() || "en";
  const t = (k: string) => translate(k, locale, translations);

  const userId = ensureActorId(req);

  const { targetType, targetId, value, extra } = req.body as {
    targetType: string; targetId: string; value: number; extra?: Record<string, unknown>;
  };

  const filter = {
    tenant: (req as any).tenant,
    user: new Types.ObjectId(userId),
    targetType,
    targetId: new Types.ObjectId(targetId),
    kind: "RATING" as const,
  };

  const doc = await Reaction.findOneAndUpdate(
    filter,
    { $set: { value: Math.max(1, Math.min(5, Number(value))), extra: extra || {} } },
    { upsert: true, new: true }
  );

  res.status(201).json({ success: true, message: t("updated"), data: { value: doc.value } });
});

/* ---- GET /reactions/ratings/summary ---- */
export const getRatingSummary: RequestHandler = asyncHandler(async (req, res) => {
  const { Reaction } = await getTenantModels(req);
  const locale = (req as any).locale || getLogLocale() || "en";
  const t = (k: string) => translate(k, locale, translations);

  const tenant = (req as any).tenant;
  const targetType = String(req.query.targetType);
  const ids: string[] = (req.query.targetIds ? String(req.query.targetIds).split(",") : [])
    .concat(req.query.targetId ? [String(req.query.targetId)] : [])
    .filter(Boolean);

  const match: any = { tenant, targetType, kind: "RATING" };
  if (ids.length) match.targetId = { $in: ids.map((s) => new Types.ObjectId(s)) };

  const pipeline = [
    { $match: match },
    { $group: { _id: { targetId: "$targetId", value: "$value" }, count: { $sum: 1 } } },
    { $group: { _id: "$_id.targetId", total: { $sum: "$count" }, dist: { $push: { k: { $toString: "$_id.value" }, v: "$count" } } } },
    {
      $lookup: {
        from: "reactions",
        let: { tid: "$_id" },
        pipeline: [
          { $match: { $expr: { $and: [
              { $eq: ["$tenant", tenant] },
              { $eq: ["$targetType", targetType] },
              { $eq: ["$kind", "RATING"] },
              { $eq: ["$targetId", "$$tid"] }
          ] } } },
          { $group: { _id: null, avg: { $avg: "$value" } } }
        ],
        as: "avgDoc"
      }
    },
    {
      $addFields: {
        average: { $ifNull: [ { $arrayElemAt: ["$avgDoc.avg", 0] }, null ] },
        distObj: { $arrayToObject: { $map: { input: "$dist", as: "d", in: ["$$d.k", "$$d.v"] } } }
      }
    },
    { $project: { avgDoc: 0, dist: 0 } }
  ];

  const rows = await Reaction.aggregate(pipeline);

  const shaped: Record<string, { count: number; average: number | null; dist: Record<"1"|"2"|"3"|"4"|"5", number> }> = {};
  for (const r of rows) {
    const tid = String(r._id);
    const dist = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, ...(r as any).distObj || {} };
    shaped[tid] = { count: (r as any).total || 0, average: (r as any).average ?? null, dist };
  }

  res.json({ success: true, message: t("listed"), data: shaped });
});
