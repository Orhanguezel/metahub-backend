import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/middleware/auth/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import { mergeLocalesForUpdate } from "@/core/utils/i18n/mergeLocalesForUpdate";
import translations from "./i18n";

/* ---------- helpers ---------- */
const tByReq = (req: Request) => (k: string) =>
  translate(k, (req as any).locale || getLogLocale(), translations);

const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };

function slugifyUnicode(input: string): string {
  if (!input) return "";
  let s = String(input).normalize("NFKC").trim();
  s = s.replace(/\s+/g, "-");
  s = s.replace(/[^\p{L}\p{N}\p{M}-]+/gu, "");
  s = s.replace(/-+/g, "-");
  s = s.replace(/^-+|-+$/g, "");
  return s.toLowerCase();
}

// SUPPORTED_LOCALES readonly tuple’ını güvenle dolaşmak için yerel sabit
const LOCALES: ReadonlyArray<SupportedLocale> = SUPPORTED_LOCALES;

type I18n = Partial<Record<SupportedLocale, string>>;

async function ensureUniqueSlugForLocale(
  tenant: string,
  base: string,
  locale: SupportedLocale,
  BrandModel: any,
  currentId?: string
): Promise<string> {
  let slug = base || "brand";
  let i = 2;
  const pathKey = `slugLower.${locale}`;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const lower = slug.toLowerCase();
    const clash = await BrandModel.findOne({
      tenant,
      [pathKey]: lower,
      ...(currentId ? { _id: { $ne: currentId } } : {}),
    }).lean();
    if (!clash) return slug;
    slug = `${base}-${i++}`;
  }
}

/** Çok dilli slug objesi oluşturur/günceller ve benzersiz kılar */
async function buildUniqueSlugObject(
  tenant: string,
  source: I18n | string | undefined,
  name: I18n,
  BrandModel: any,
  currentId?: string
): Promise<I18n> {
  const out: I18n = {};
  const src = (typeof source === "string" ? {} : (source || {})) as I18n;

  for (const loc of LOCALES) {
    const raw =
      (src as any)[loc] ??
      (name as any)[loc] ??
      (name as any)["en"] ??
      (Object.values(name || {})[0] as string) ??
      "brand";
    const base = slugifyUnicode(String(raw));
    out[loc] = await ensureUniqueSlugForLocale(tenant, base, loc, BrandModel, currentId);
  }
  return out;
}

/* ====== CREATE ====== */
export const createBrand = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { Brand } = await getTenantModels(req);

  const tenant = (req as any).tenant as string;

  // parse i18n fields
  const name = (parseIfJson(req.body?.name) || {}) as I18n;
  const description = (parseIfJson(req.body?.description) || {}) as I18n;

  if (!Object.values(name || {}).some((v) => typeof v === "string" && v.trim())) {
    res.status(400).json({ success: false, message: t("validation.nameInvalid") });
    return;
  }

  // slug: string | i18n
  const slugInput = parseIfJson(req.body?.slug) as I18n | string | undefined;

  // benzersiz çok dilli slug
  const slugObj = await buildUniqueSlugObject(tenant, slugInput, name, Brand);

  // create
  const doc = await Brand.create({
    tenant,
    name,
    description,
    slug: slugObj, // slugLower hook’ta üretilecek
    website: req.body?.website,
    order: Number.isFinite(+req.body?.order) ? +req.body.order : 0,
    status: (req.body?.status === "inactive" ? "inactive" : "active"),
    images: Array.isArray(req.body?.images) ? req.body.images : [],
  });

  res.status(201).json({ success: true, message: t("created"), data: doc });
});

/* ====== UPDATE ====== */
export const updateBrand = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const { Brand } = await getTenantModels(req);
  const tenant = (req as any).tenant as string;
  const locale: SupportedLocale = ((req as any).locale as SupportedLocale) || "tr";

  const doc = await Brand.findOne({ _id: id, tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const U = req.body as Record<string, unknown>;

  // i18n merge
  if (U.name !== undefined) (doc as any).name = mergeLocalesForUpdate((doc as any).name, U.name);
  if (U.description !== undefined) (doc as any).description = mergeLocalesForUpdate((doc as any).description, U.description);

  // slug: string -> sadece mevcut locale; object -> sadece gelen locale’ler
  if (U.slug !== undefined) {
    const slugInput = parseIfJson(U.slug) as I18n | string | undefined;

    if (typeof slugInput === "string") {
      const base = slugifyUnicode(slugInput);
      const unique = await ensureUniqueSlugForLocale(tenant, base, locale, Brand, String((doc as any)._id));
      (doc as any).slug = { ...(doc as any).slug, [locale]: unique };
    } else {
      const incoming = (slugInput || {}) as I18n;
      const next: I18n = { ...(doc as any).slug };
      for (const loc of LOCALES) {
        if (incoming[loc]) {
          const base = slugifyUnicode(String(incoming[loc]));
          next[loc] = await ensureUniqueSlugForLocale(tenant, base, loc, Brand, String((doc as any)._id));
        }
      }
      (doc as any).slug = next;
    }
  }

  // düz alanlar
  if (U.website !== undefined) (doc as any).website = U.website;
  if (U.order !== undefined) (doc as any).order = Number.isFinite(+(U.order as any)) ? +(U.order as any) : (doc as any).order;
  if (U.status !== undefined && (U.status === "active" || U.status === "inactive")) (doc as any).status = U.status;
  if (U.images !== undefined && Array.isArray(U.images)) (doc as any).images = U.images as any[];

  await doc.save();
  res.status(200).json({ success: true, message: t("updated"), data: doc });
});

/* ====== DELETE ====== */
export const deleteBrand = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const { Brand } = await getTenantModels(req);
  const doc = await Brand.findOne({ _id: id, tenant: (req as any).tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  await doc.deleteOne();
  res.status(200).json({ success: true, message: t("deleted") });
});

/* ====== ADMIN LIST ====== */
export const adminGetBrands = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { Brand } = await getTenantModels(req);

  const {
    status, q, lang = "tr", limit = "200", sort = "order_asc",
  } = req.query as Record<string, string>;

  const filter: Record<string, any> = { tenant: (req as any).tenant };
  if (status) filter.status = status;

  if (q && q.trim()) {
    const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { [`name.${lang}`]: rx },
      // tüm locale’lerde slugLower araması
      ...LOCALES.map((l) => ({ [`slugLower.${l}`]: rx })),
    ];
  }

  const sortMap: Record<string, any> = {
    order_asc: { order: 1, createdAt: -1 },
    order_desc: { order: -1, createdAt: -1 },
    created_desc: { createdAt: -1 },
    created_asc: { createdAt: 1 },
  };

  const list = await Brand.find(filter)
    .limit(Math.min(Number(limit) || 200, 500))
    .sort(sortMap[sort] || sortMap.order_asc)
    .lean();

  res.status(200).json({ success: true, message: t("listFetched"), data: list });
});

/* ====== GET BY ID ====== */
export const adminGetBrandById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const { Brand } = await getTenantModels(req);
  const doc = await Brand.findOne({ _id: id, tenant: (req as any).tenant }).lean();

  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
});
