import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

/* helpers */
const mapSocials = (v: any) =>
  v instanceof Map ? Object.fromEntries(v as any) : v || {};

const splitCsv = (s?: string) =>
  String(s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

/** GET /storefront  → public settings (defaults or partial with ?fields=) */
export const getPublicSettings = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { StorefrontSettings } = await getTenantModels(req);
  const doc = await StorefrontSettings.findOne({ tenant: req.tenant }).lean();

  const defaultPayload = {
    tenant: req.tenant,
    currency: "USD",
    currencies: [],
    locale: "tr-TR",
    locales: [],
    priceIncludesTax: false,
    measurement: "metric" as const,
    menus: [],
    banners: [],
    featuredCategories: [],
    featuredProducts: [],
    socials: {},
    updatedAt: undefined as any,
  };

  const payload = doc
    ? { ...doc, socials: mapSocials(doc.socials) }
    : defaultPayload;

  const fieldsCsv = String(req.query.fields || "").trim();
  if (fieldsCsv) {
    const fields = new Set(splitCsv(fieldsCsv));
    const out: Record<string, any> = {};
    for (const k of fields) {
      if (k in payload) out[k] = (payload as any)[k];
    }
    res.status(200).json({ success: true, data: out, meta: { partial: true } });
    return;
  }

  res.status(200).json({ success: true, data: payload, meta: { default: !doc } });
});

/** GET /storefront/banners?position=&positions=&limit= */
export const getPublicBanners = asyncHandler(async (req: Request, res: Response) => {
  const { StorefrontSettings } = await getTenantModels(req);
  const s = await StorefrontSettings.findOne({ tenant: req.tenant }, { banners: 1, updatedAt: 1 }).lean();

  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "50"), 10)));
  const pos = String(req.query.position || "").trim();
  const posSet = new Set(splitCsv(String(req.query.positions || "")));

  let banners = (s?.banners || []).filter((b: any) => b?.isActive !== false);

  if (pos) banners = banners.filter((b: any) => String(b?.position || "") === pos);
  else if (posSet.size) banners = banners.filter((b: any) => posSet.has(String(b?.position || "")));

  banners.sort((a: any, b: any) => (a?.order || 0) - (b?.order || 0));
  const data = banners.slice(0, limit);

  res.status(200).json({
    success: true,
    data,
    meta: { total: banners.length, limit, updatedAt: s?.updatedAt },
  });
});

/** GET /storefront/banners/grouped?positions=a,b,c */
export const getPublicBannersGrouped = asyncHandler(async (req: Request, res: Response) => {
  const { StorefrontSettings } = await getTenantModels(req);
  const s = await StorefrontSettings.findOne({ tenant: req.tenant }, { banners: 1, updatedAt: 1 }).lean();

  const want = splitCsv(String(req.query.positions || ""));
  const groupKeys = want.length ? want : Array.from(
    new Set((s?.banners || []).map((b: any) => String(b?.position || "")).filter(Boolean))
  );

  const out: Record<string, any[]> = {};
  for (const k of groupKeys) out[k] = [];

  for (const b of s?.banners || []) {
    if (b?.isActive === false) continue;
    const p = String(b?.position || "");
    if (!p) continue;
    if (!want.length || want.includes(p)) out[p].push(b);
  }

  for (const k of Object.keys(out)) out[k].sort((a, b) => (a?.order || 0) - (b?.order || 0));

  res.status(200).json({ success: true, data: out, meta: { updatedAt: s?.updatedAt } });
});

/** GET /storefront/menus  → aktif menüler (root) */
export const getPublicMenus = asyncHandler(async (req: Request, res: Response) => {
  const { StorefrontSettings } = await getTenantModels(req);
  const s = await StorefrontSettings.findOne({ tenant: req.tenant }, { menus: 1, updatedAt: 1 }).lean();

  const menus = (s?.menus || [])
    .filter((m: any) => m?.isActive !== false)
    .sort((a: any, b: any) => (a?.order || 0) - (b?.order || 0));

  res.status(200).json({ success: true, data: menus, meta: { updatedAt: s?.updatedAt } });
});

/** GET /storefront/menus/:key  → ağaçta key ile tek menu */
function findMenuByKey(items: any[], key: string): any | null {
  for (const it of items || []) {
    if (String(it?.key) === key) return it;
    if (Array.isArray(it?.children)) {
      const hit = findMenuByKey(it.children, key);
      if (hit) return hit;
    }
  }
  return null;
}

export const getPublicMenuByKey = asyncHandler(async (req: Request, res: Response) => {
  const { key } = req.params;
  const { StorefrontSettings } = await getTenantModels(req);
  const s = await StorefrontSettings.findOne({ tenant: req.tenant }, { menus: 1 }).lean();

  const found = findMenuByKey(s?.menus || [], key);
  if (!found) { res.status(404).json({ success: false, message: "menu_not_found" }); return; }

  res.status(200).json({ success: true, data: found });
});

/** GET /storefront/highlights  → featured lists */
export const getPublicHighlights = asyncHandler(async (req: Request, res: Response) => {
  const { StorefrontSettings } = await getTenantModels(req);
  const s = await StorefrontSettings.findOne(
    { tenant: req.tenant },
    { featuredCategories: 1, featuredProducts: 1, updatedAt: 1 }
  ).lean();

  res.status(200).json({
    success: true,
    data: {
      featuredCategories: s?.featuredCategories || [],
      featuredProducts: s?.featuredProducts || [],
    },
    meta: { updatedAt: s?.updatedAt },
  });
});

/** GET /storefront/socials */
export const getPublicSocials = asyncHandler(async (req: Request, res: Response) => {
  const { StorefrontSettings } = await getTenantModels(req);
  const s = await StorefrontSettings.findOne({ tenant: req.tenant }, { socials: 1, updatedAt: 1 }).lean();

  res.status(200).json({
    success: true,
    data: mapSocials(s?.socials),
    meta: { updatedAt: s?.updatedAt },
  });
});

/** GET /storefront/meta  → küçük meta: updatedAt, locale, currency */
export const getPublicMeta = asyncHandler(async (req: Request, res: Response) => {
  const { StorefrontSettings } = await getTenantModels(req);
  const s = await StorefrontSettings.findOne(
    { tenant: req.tenant },
    { updatedAt: 1, locale: 1, currency: 1 }
  ).lean();

  res.status(200).json({
    success: true,
    data: {
      updatedAt: s?.updatedAt || null,
      locale: s?.locale || "tr-TR",
      currency: s?.currency || "USD",
    },
  });
});

/** GET /storefront/positions  → mevcut banner pozisyonları */
export const getPublicPositions = asyncHandler(async (req: Request, res: Response) => {
  const { StorefrontSettings } = await getTenantModels(req);
  const s = await StorefrontSettings.findOne({ tenant: req.tenant }, { banners: 1 }).lean();

  const positions = Array.from(
    new Set((s?.banners || []).map((b: any) => String(b?.position || "")).filter(Boolean))
  );

  res.status(200).json({ success: true, data: positions });
});
