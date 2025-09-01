import type { Request, Response, RequestHandler } from "express";
import asyncHandler from "express-async-handler";
import { Types, isValidObjectId } from "mongoose";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";

/* ---------- helpers ---------- */

type AnyDoc = Record<string, any>;

const pickFirst = (obj?: Record<string, any>) =>
  obj && typeof obj === "object" ? String(Object.values(obj)[0] ?? "") : "";

const pickI18n = (v: any, locale: string) => {
  if (!v) return "";
  if (typeof v === "string") return v;
  // translated object { tr,en,... }
  return v[locale] || v.en || v.tr || pickFirst(v);
};

const getUserLabel = (u: AnyDoc): string =>
  u?.displayName ||
  u?.fullName ||
  u?.name ||
  u?.username ||
  u?.email ||
  (u?._id ? String(u._id) : "");

const getTargetLabel = (doc: AnyDoc, type: string, locale: string): string => {
  const t = String(type || "").toLowerCase();
  switch (t) {
    case "about":
    case "post":
      return pickI18n(doc?.title, locale) || doc?.slug || String(doc?._id || "");
    case "menuitem":
      return pickI18n(doc?.title, locale) || pickI18n(doc?.name, locale) || doc?.slug || String(doc?._id || "");
    case "product":
      return doc?.name || pickI18n(doc?.title, locale) || doc?.sku || doc?.slug || String(doc?._id || "");
    case "category":
      return pickI18n(doc?.name, locale) || pickI18n(doc?.title, locale) || doc?.slug || String(doc?._id || "");
    case "comment":
      return doc?.summary || doc?.text || doc?.content || String(doc?._id || "");
    default:
      return doc?.name || doc?.title || doc?.label || String(doc?._id || "");
  }
};

const TARGET_MODEL_KEY: Record<string, string> = {
  menuitem: "MenuItem",
  product: "Product",
  about: "About",
  post: "Post",
  comment: "Comment",
  category: "Category",
};

const TARGET_SELECT: Record<string, string> = {
  menuitem: "title name slug",
  product: "name title sku slug",
  about: "title slug",
  post: "title slug",
  comment: "summary text content",
  category: "name title slug",
};

/** liste içinde target adlarını tek seferde topla */
async function hydrateTargets(req: Request, items: AnyDoc[], locale: string) {
  const tenant = (req as any).tenant;
  const models = await getTenantModels(req);

  const idsByType = new Map<string, Set<string>>();
  for (const r of items) {
    const tt = String(r.targetType);
    if (!idsByType.has(tt)) idsByType.set(tt, new Set());
    idsByType.get(tt)!.add(String(r.targetId));
  }

  const labelMaps = new Map<string, Map<string, string>>();

  for (const [type, idset] of idsByType.entries()) {
    const key = TARGET_MODEL_KEY[type.toLowerCase()];
    const Model = key ? (models as any)[key] : undefined;
    if (!Model) continue;

    const ids = Array.from(idset).map((s) => new Types.ObjectId(s));
    const sel = TARGET_SELECT[type.toLowerCase()] || "";
    const docs: AnyDoc[] = await Model.find({ tenant, _id: { $in: ids } })
      .select(sel)
      .lean();

    const map = new Map<string, string>();
    for (const d of docs) {
      map.set(String(d._id), getTargetLabel(d, type, locale));
    }
    labelMaps.set(type, map);
  }

  // çıktıyı zenginleştir
  return items.map((it) => {
    const lm = labelMaps.get(String(it.targetType));
    const targetLabel = lm?.get(String(it.targetId)) || String(it.targetId);

    const u = it.user; // populated user object
    const userDisplay = u && typeof u === "object" ? getUserLabel(u) : String(it.user);

    return { ...it, userDisplay, targetLabel };
  });
}

/* ----- GET /admin/reactions ----- */
export const adminListReactions: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { Reaction } = await getTenantModels(req);
  const locale = (req as any).locale || getLogLocale() || "en";
  const t = (k: string) => translate(k, locale, translations);

  const {
    user, targetType, targetId, kind, emoji, isActive, value, page = "1", limit = "50",
  } = req.query as Record<string, string>;

  const filter: any = { tenant: (req as any).tenant };

  if (user && isValidObjectId(user)) filter.user = new Types.ObjectId(user);
  if (targetType) filter.targetType = targetType;
  if (targetId && isValidObjectId(targetId)) filter.targetId = new Types.ObjectId(targetId);
  if (kind) filter.kind = kind;
  if (emoji) filter.emoji = emoji;
  if (typeof isActive === "string") filter.isActive = isActive === "true";
  if (value !== undefined && value !== "") {
    const v = Number(value);
    if (Number.isFinite(v)) filter.value = v; // RATING için
  }

  const p = Math.max(1, parseInt(page, 10));
  const lim = Math.max(1, Math.min(200, parseInt(limit, 10)));
  const skip = (p - 1) * lim;

  const [raw, total] = await Promise.all([
    Reaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(lim)
      .populate({ path: "user", select: "displayName fullName name username email", options: { lean: true } })
      .lean(),
    Reaction.countDocuments(filter),
  ]);

  // hedef adlarını ekle + kullanıcı için gösterilecek isim çıkar
  const items = await hydrateTargets(req, raw, locale);

  res.json({ success: true, message: t("listed"), data: items, meta: { total, page: p, limit: lim } });
});


/* ----- DELETE /admin/reactions/:id ----- */
export const adminDeleteReaction: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { Reaction } = await getTenantModels(req);
  const locale = (req as any).locale || getLogLocale() || "en";
  const t = (k: string) => translate(k, locale, translations);

  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await Reaction.findOne({ _id: id, tenant: (req as any).tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  await doc.deleteOne();
  res.json({ success: true, message: t("deleted") });
});

/* ----- DELETE /admin/reactions (bulk by filter) ----- */
export const adminDeleteByFilter: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { Reaction } = await getTenantModels(req);
  const locale = (req as any).locale || getLogLocale() || "en";
  const t = (k: string) => translate(k, locale, translations);

  const { targetType, targetId } = req.query as Record<string, string>;
  if (!targetType || !targetId || !isValidObjectId(targetId)) {
    res.status(400).json({ success: false, message: t("validation.invalidTarget") });
    return;
  }

  const out = await Reaction.deleteMany({
    tenant: (req as any).tenant,
    targetType,
    targetId: new Types.ObjectId(targetId),
  });

  res.json({ success: true, message: t("deleted_many"), data: { deletedCount: out.deletedCount } });
});

