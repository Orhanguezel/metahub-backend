import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { rebuildSearchIndexForTenant, upsertSearchIndex, normalizeText } from "./projector.service";
import { isValidObjectId } from "@/core/middleware/auth/validation";
import { SUPPORTED_LOCALES } from "@/types/common";

/* ---------- helpers: i18n & image & slug ---------- */

type I18nObj = Record<string, string>;

/** Objeyi tüm desteklenen dillere tamamla. Eksikleri en→ilk-var-olan fallback ile doldurur. */
function ensureAllLocales(src?: I18nObj | Map<string, string>): I18nObj {
  const o: I18nObj = {};
  if (src instanceof Map) {
    for (const [k, v] of src.entries()) o[k] = String(v ?? "");
  } else if (src && typeof src === "object") {
    for (const k of Object.keys(src)) o[k] = String((src as any)[k] ?? "");
  }
  const base =
    (o.en && o.en.trim()) ||
    Object.values(o).find((v) => v && v.trim()) ||
    "";
  for (const lang of SUPPORTED_LOCALES) {
    if (!o[lang] || !o[lang].trim()) o[lang] = base;
  }
  return o;
}

/** image alanını string’e zorunlu döndür. */
function pickImageUrl(img: any): string | undefined {
  if (!img) return undefined;
  if (typeof img === "string") return img;
  return img.secure_url || img.url || img.webp || img.thumbnail || undefined;
}

/** slug: string veya i18n obje → ascii kebab-case string */
function ensureSlugString(val: any): string | undefined {
  let s: string | undefined;
  if (typeof val === "string") s = val;
  else if (val && typeof val === "object") {
    s = val.en || val.tr || Object.values(val).find((v) => typeof v === "string") as string | undefined;
  }
  if (!s) return undefined;
  const out = s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
  return out || undefined;
}

/* ---------- LIST ---------- */
export const adminListIndex = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { SearchIndex } = await getTenantModels(req);
  const { q, type, isActive, page = "1", limit = "50" } = req.query as Record<string, string>;

  const filter: any = { tenant: req.tenant };
  if (type) filter.type = type;
  if (typeof isActive === "string") filter.isActive = isActive === "true";
  if (q && q.trim()) {
    const rx = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ searchable: rx }, { slug: rx }];
  }

  const pg = Math.max(parseInt(page, 10) || 1, 1);
  const lm = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 500);

  const cursor = SearchIndex.find(filter).sort({ updatedAt: -1 }).skip((pg - 1) * lm).limit(lm).lean();
  const [items, total] = await Promise.all([cursor, SearchIndex.countDocuments(filter)]);

  const data = (items || []).map((it: any) => ({
    ...it,
    title: ensureAllLocales(it.title),
    subtitle: ensureAllLocales(it.subtitle),
    image: pickImageUrl(it.image),
    slug: ensureSlugString(it.slug) || it.slug, // güvenlik
  }));

  res.status(200).json({ success: true, data, meta: { page: pg, limit: lm, total } });
});

/* ---------- GET BY ID ---------- */
export const adminGetIndexById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { SearchIndex } = await getTenantModels(req);
  const { id } = req.params;
  if (!isValidObjectId(id)) { res.status(400).json({ success: false, message: "invalid_id" }); return; }
  const doc = await SearchIndex.findOne({ _id: id, tenant: req.tenant }).lean();
  if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }

  const data = {
    ...doc,
    title: ensureAllLocales(doc.title as any),
    subtitle: ensureAllLocales(doc.subtitle as any),
    image: pickImageUrl((doc as any).image),
    slug: ensureSlugString((doc as any).slug) || (doc as any).slug,
  };

  res.status(200).json({ success: true, data });
});

/* ---------- DELETE ---------- */
export const adminDeleteIndex = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { SearchIndex } = await getTenantModels(req);
  const { id } = req.params;
  if (!isValidObjectId(id)) { res.status(400).json({ success: false, message: "invalid_id" }); return; }
  const doc = await SearchIndex.findOne({ _id: id, tenant: req.tenant });
  if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }
  await (doc as any).deleteOne();
  res.status(200).json({ success: true, message: "deleted" });
});

/* ---------- REBUILD ---------- */
export const adminRebuildIndex = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { SearchIndex, Product, Brand, Category } = await getTenantModels(req);
  const types = (req.body?.types as any[]) || undefined;

  await rebuildSearchIndexForTenant(
    req.tenant,
    { SearchIndex, Product, Brand, Category },
    types
  );

  res.status(200).json({ success: true, message: "rebuilt" });
});

/* ---------- UPSERT ONE ---------- */
export const adminUpsertIndex = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { SearchIndex } = await getTenantModels(req);
  const raw = (req.body || {}) as any;

  const title = ensureAllLocales(raw.title);
  const subtitle = ensureAllLocales(raw.subtitle);
  const image = pickImageUrl(raw.image);
  const slug = ensureSlugString(raw.slug);

  const searchable =
    raw.searchable ||
    normalizeText(
      ...Object.values(title),
      ...Object.values(subtitle),
      slug,
      ...(raw.keywords || []),
      raw.brand?.name,
      raw.category?.name
    );

  const payload = {
    ...raw,
    tenant: req.tenant,
    title,
    subtitle,
    image,
    slug,          // << burada string garanti
    searchable,
  };

  await upsertSearchIndex(SearchIndex, payload);
  res.status(200).json({ success: true, message: "upserted" });
});
