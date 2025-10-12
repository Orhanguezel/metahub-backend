import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { calcTaxCents, scoreZone } from "./utils";
import i18n from "./i18n";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { AddressLike } from "./types";

const tByReq = (req: Request) => (k: string) =>
  translate(k, (req as any).locale || getLogLocale(), i18n);

async function getModels(req: Request) {
  const m: any = await getTenantModels(req);
  const TaxRate = m.TaxRate || (await import("./models.taxrate")).TaxRate;
  const GeoZone = m.GeoZone || (await import("./models.geozone")).GeoZone;
  return { TaxRate, GeoZone };
}

/** POST /api/v1/tax/resolve  => { address, productClass } */
export const resolveTaxRate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { TaxRate, GeoZone } = await getModels(req);
  const t = tByReq(req);

  const { address, productClass } = req.body as { address: AddressLike; productClass?: string };
  const now = new Date();

  const filter: any = {
    tenant: (req as any).tenant,
    isActive: true,
    $and: [
      { $or: [{ startAt: { $exists: false } }, { startAt: { $lte: now } }] },
      { $or: [{ endAt: { $exists: false } }, { endAt: { $gte: now } }] },
    ],
  };
  if (productClass) filter.productClasses = { $in: [productClass] };

  const rates = await TaxRate.find(filter).lean();

  // skorla
  const zonesMap = new Map<string, any>();
  const getZone = async (id?: any) => {
    if (!id) return null;
    const key = String(id);
    if (zonesMap.has(key)) return zonesMap.get(key);
    const z = await GeoZone.findById(id).lean();
    zonesMap.set(key, z);
    return z;
  };

  let best: any = null;
  let bestScore = -1;

  for (const r of rates) {
    const z = await getZone(r.zone);
    const s = scoreZone(address || {}, z);
    const eff = s + (Number(r.priority) || 0) * 10;
    if (eff > bestScore) {
      best = r;
      bestScore = eff;
    }
  }

  res.status(200).json({ success: true, message: t("resolved"), data: best });
  return;
});

/** POST /api/v1/tax/calc => { amount_cents, ratePct, inclusive } veya { amount_cents, taxRateId } */
export const calcTax = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { TaxRate } = await getModels(req);
  const t = tByReq(req);

  const { amount_cents, ratePct, inclusive, taxRateId } = req.body as {
    amount_cents: number;
    ratePct?: number;
    inclusive?: boolean;
    taxRateId?: string;
  };

  let pct = Number(ratePct || 0);
  let inc = Boolean(inclusive);

  if (taxRateId) {
    const tr = await TaxRate.findOne({ _id: taxRateId, tenant: (req as any).tenant }).lean();
    if (!tr) {
      res.status(404).json({ success: false, message: "tax_rate_not_found" });
      return;
    }
    pct = Math.round((Number(tr.rate) || 0) * 10000) / 100; // 0..1 → %
    inc = Boolean(tr.inclusive);
  }

  const out = calcTaxCents(Number(amount_cents || 0), pct, inc);
  res.status(200).json({ success: true, message: t("calcOk"), data: { ...out, ratePct: pct, inclusive: inc } });
  return;
});
