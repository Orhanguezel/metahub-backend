import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

/** GET /storefront/admin  → mevcut ayarlar (yoksa 404 yerine default döndürmek istemiyorsak 404 veriyoruz) */
export const getAdminSettings = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { StorefrontSettings } = await getTenantModels(req);
  const doc = await StorefrontSettings.findOne({ tenant: req.tenant }).lean();
  if (!doc) {
    res.status(404).json({ success: false, message: "not_found" });
    return;
  }
  res.status(200).json({ success: true, data: doc });
});

/** PUT /storefront/admin  → upsert (create or update) */
export const upsertSettings = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { StorefrontSettings } = await getTenantModels(req);
  const payload = { ...(req.body || {}) };
  payload.tenant = req.tenant;

  // Varsayılanlar (boş kalan alanları normalize edelim)
  if (typeof payload.currency === "string") payload.currency = payload.currency.toUpperCase();
  if (Array.isArray(payload.currencies)) payload.currencies = Array.from(new Set(payload.currencies.map((c: string) => c.toUpperCase())));
  if (typeof payload.locale === "string") payload.locale = payload.locale.trim();
  if (Array.isArray(payload.locales)) payload.locales = Array.from(new Set(payload.locales.map((l: string) => l.trim())));

  const doc = await StorefrontSettings.findOneAndUpdate(
    { tenant: req.tenant },
    { $set: payload },
    { upsert: true, new: true }
  ).lean();

  res.status(200).json({ success: true, data: doc });
});
