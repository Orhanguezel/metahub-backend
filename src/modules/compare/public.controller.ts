import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import i18n from "./i18n";

const tByReq = (req: Request) => (k: string) =>
  translate(k, (req as any).locale || getLogLocale(), i18n);

async function getModels(req: Request) {
  const m: any = await getTenantModels(req);
  const Compare = m.Compare || (await import("./models")).Compare;
  return { Compare };
}

function resolveOwner(req: Request): { user?: any; session?: string } {
  const userId = (req as any).user?._id;
  const sessionFromHeader = (req.get("x-session-id") || (req.headers as any)["x-session-id"]) as string | undefined;
  const sessionFromBody = (req.body?.session as string) || (req.query?.session as string);
  const session = sessionFromBody || sessionFromHeader;
  const out: { user?: any; session?: string } = {};
  if (userId) out.user = userId;
  if (!userId && session) out.session = String(session);
  return out;
}

/* GET /compare/me */
export const getMyCompare = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { Compare } = await getModels(req);
  const t = tByReq(req);

  const owner = resolveOwner(req);
  if (!owner.user && !owner.session) {
    res.status(400).json({ success: false, message: t("validation.ownerMissing") });
    return;
  }

  const filter: any = { tenant: (req as any).tenant, ...owner };
  const doc = await Compare.findOne(filter)
    .populate([
      { path: "items.product", select: "title slug price_cents currency brand" },
      { path: "items.variant", select: "sku optionsKey price_cents" },
    ])
    .lean();

  res.status(200).json({ success: true, message: t("fetched"), data: doc || { items: [] } });
});

/* POST /compare/items { product, variant?, note?, session? } */
export const addCompareItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { Compare } = await getModels(req);
  const t = tByReq(req);

  const owner = resolveOwner(req);
  if (!owner.user && !owner.session) {
    res.status(400).json({ success: false, message: t("validation.ownerMissing") });
    return;
  }

  const { product, variant, note } = req.body as { product: string; variant?: string; note?: string };
  const filter: any = { tenant: (req as any).tenant, ...owner };

  let doc = await Compare.findOne(filter);
  if (!doc) {
    doc = await Compare.create({ ...filter, items: [] });
  }

  const key = `${String(product)}:${variant ? String(variant) : ""}`;
  const exists = (doc.items || []).some((it: any) => {
    const k = `${String(it.product)}:${it.variant ? String(it.variant) : ""}`;
    return k === key;
  });

  if (exists) {
    res.status(200).json({ success: true, message: t("item.exists"), data: doc.toJSON() });
    return;
  }

  // pre('save') dedupe var; limit 50 için kullanıcı mesajını ayarlayalım
  const MAX_ITEMS = 50;
  let message = t("item.added");
  if ((doc.items || []).length >= MAX_ITEMS) {
    (doc.items as any).shift();           // en eskisini at
    message = t("item.limitExceeded");
  }

  (doc.items as any).push({
    product,
    variant: variant || null,
    note,
    addedAt: new Date(),
  });

  await (doc as any).save();
  res.status(201).json({ success: true, message, data: doc.toJSON() });
});

/* DELETE /compare/items { product, variant?, session? } */
export const removeCompareItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { Compare } = await getModels(req);
  const t = tByReq(req);

  const owner = resolveOwner(req);
  if (!owner.user && !owner.session) {
    res.status(400).json({ success: false, message: t("validation.ownerMissing") });
    return;
  }

  const { product, variant } = req.body as { product: string; variant?: string };
  const doc = await Compare.findOne({ tenant: (req as any).tenant, ...owner });
  if (!doc) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  const before = (doc.items || []).length;
  (doc.items as any) = (doc.items || []).filter((it: any) => {
    const sameProduct = String(it.product) === String(product);
    const sameVariant = (it.variant ? String(it.variant) : "") === (variant ? String(variant) : "");
    return !(sameProduct && sameVariant);
  });

  if ((doc.items || []).length !== before) {
    await (doc as any).save();
  }

  res.status(200).json({ success: true, message: t("item.removed"), data: doc.toJSON() });
});

/* DELETE /compare/clear { session? } */
export const clearMyCompare = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { Compare } = await getModels(req);
  const t = tByReq(req);

  const owner = resolveOwner(req);
  if (!owner.user && !owner.session) {
    res.status(400).json({ success: false, message: t("validation.ownerMissing") });
    return;
  }

  const doc = await Compare.findOne({ tenant: (req as any).tenant, ...owner });
  if (!doc) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  (doc.items as any) = [];
  await (doc as any).save();

  res.status(200).json({ success: true, message: t("item.cleared"), data: doc.toJSON() });
});

/* POST /compare/merge { fromSession }  (guest→user birleştirme) */
export const mergeCompare = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { Compare } = await getModels(req);
  const t = tByReq(req);

  const userId = (req as any).user?._id;
  if (!userId) { res.status(401).json({ success: false, message: "unauthorized" }); return; }

  const { fromSession } = req.body as { fromSession: string };
  const tenant = (req as any).tenant;

  const userDoc = await Compare.findOne({ tenant, user: userId });
  const guestDoc = await Compare.findOne({ tenant, session: fromSession });

  if (!guestDoc) {
    res.status(200).json({ success: true, message: t("merged"), data: userDoc || null });
    return;
  }

  let base = userDoc;
  if (!base) base = await Compare.create({ tenant, user: userId, items: [] });

  const seen = new Set(
    (base.items || []).map((it: any) => `${String(it.product)}:${it.variant ? String(it.variant) : ""}`)
  );

  for (const it of guestDoc.items || []) {
    const k = `${String(it.product)}:${it.variant ? String(it.variant) : ""}`;
    if (seen.has(k)) continue;
    (base.items as any).push({ product: it.product, variant: it.variant || null, addedAt: new Date() });
    seen.add(k);
  }

  await (base as any).save();
  await (guestDoc as any).deleteOne();

  res.status(200).json({ success: true, message: t("merged"), data: base.toJSON() });
});
