import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import i18n from "./i18n";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";

const tByReq = (req: Request) => (k: string) =>
  translate(k, (req as any).locale || getLogLocale(), i18n);

/* Helper: model fallback (getTenantModels -> local import adı farklıysa) */
async function getModels(req: Request) {
  const m: any = await getTenantModels(req);
  // Beklenen isimler: TaxRate, GeoZone
  const TaxRate = m.TaxRate || (await import("./models.taxrate")).TaxRate;
  const GeoZone = m.GeoZone || (await import("./models.geozone")).GeoZone;
  return { TaxRate, GeoZone };
}

/* ====== TAX RATE: LIST ====== */
export const listTaxRates = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { TaxRate } = await getModels(req);
  const t = tByReq(req);

  const { isActive, zone, q, limit = "200", class: klass } = req.query as Record<string, string>;
  const filter: Record<string, any> = { tenant: (req as any).tenant };

  if (typeof isActive === "string") filter.isActive = isActive === "true";
  if (zone) filter.zone = zone;
  if (klass) filter.productClasses = { $in: [klass] };
  if (q) filter.name = { $regex: String(q).trim(), $options: "i" };

  const items = await TaxRate.find(filter)
    .limit(Math.min(Number(limit) || 200, 500))
    .sort({ priority: -1, name: 1 })
    .lean();

  res.status(200).json({ success: true, message: t("listFetched"), data: items });
  return;
});

/* ====== TAX RATE: GET BY ID ====== */
export const getTaxRateById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { TaxRate } = await getModels(req);
  const t = tByReq(req);

  const doc = await TaxRate.findOne({ _id: req.params.id, tenant: (req as any).tenant })
    .populate({ path: "zone", select: "name countries states postalCodes" })
    .lean();

  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }
  res.status(200).json({ success: true, message: t("fetched"), data: doc });
  return;
});

/* ====== TAX RATE: CREATE ====== */
export const createTaxRate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { TaxRate } = await getModels(req);
  const t = tByReq(req);

  const payload = { ...(req.body || {}) };
  (payload as any).tenant = (req as any).tenant;

  const created = await TaxRate.create(payload);
  res.status(201).json({ success: true, message: t("created"), data: created });
  return;
});

/* ====== TAX RATE: UPDATE ====== */
export const updateTaxRate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { TaxRate } = await getModels(req);
  const t = tByReq(req);

  const doc = await TaxRate.findOne({ _id: req.params.id, tenant: (req as any).tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const up = { ...(req.body || {}) };
  const fields = ["name","zone","rate","inclusive","priority","productClasses","isActive","startAt","endAt"] as const;
  for (const f of fields) if ((up as any)[f] !== undefined) (doc as any)[f] = (up as any)[f];

  await (doc as any).save();
  res.status(200).json({ success: true, message: t("updated"), data: doc.toJSON() });
  return;
});

/* ====== TAX RATE: DELETE ====== */
export const deleteTaxRate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { TaxRate } = await getModels(req);
  const t = tByReq(req);

  const doc = await TaxRate.findOne({ _id: req.params.id, tenant: (req as any).tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  await (doc as any).deleteOne();
  res.status(200).json({ success: true, message: t("deleted") });
  return;
});

/* ====== GEO ZONE: LIST ====== */
export const listZones = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { GeoZone } = await getModels(req);
  const t = tByReq(req);

  const { q, limit = "200" } = req.query as Record<string, string>;
  const filter: Record<string, any> = { tenant: (req as any).tenant };
  if (q) filter.name = { $regex: String(q).trim(), $options: "i" };

  const items = await GeoZone.find(filter)
    .limit(Math.min(Number(limit) || 200, 500))
    .sort({ name: 1 })
    .lean();

  res.status(200).json({ success: true, message: t("zone.listFetched"), data: items });
  return;
});

/* ====== GEO ZONE: GET BY ID ====== */
export const getZoneById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { GeoZone } = await getModels(req);
  const t = tByReq(req);

  const doc = await GeoZone.findOne({ _id: req.params.id, tenant: (req as any).tenant }).lean();
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }
  res.status(200).json({ success: true, message: t("zone.fetched"), data: doc });
  return;
});

/* ====== GEO ZONE: CREATE ====== */
export const createZone = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { GeoZone } = await getModels(req);
  const t = tByReq(req);

  const payload = { ...(req.body || {}) };
  (payload as any).tenant = (req as any).tenant;

  const created = await GeoZone.create(payload);
  res.status(201).json({ success: true, message: t("zone.created"), data: created });
  return;
});

/* ====== GEO ZONE: UPDATE ====== */
export const updateZone = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { GeoZone } = await getModels(req);
  const t = tByReq(req);

  const doc = await GeoZone.findOne({ _id: req.params.id, tenant: (req as any).tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const up = { ...(req.body || {}) };
  const fields = ["name","countries","states","postalCodes"] as const;
  for (const f of fields) if ((up as any)[f] !== undefined) (doc as any)[f] = (up as any)[f];

  await (doc as any).save();
  res.status(200).json({ success: true, message: t("zone.updated"), data: doc.toJSON() });
  return;
});

/* ====== GEO ZONE: DELETE ====== */
export const deleteZone = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { GeoZone } = await getModels(req);
  const t = tByReq(req);

  const doc = await GeoZone.findOne({ _id: req.params.id, tenant: (req as any).tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  await (doc as any).deleteOne();
  res.status(200).json({ success: true, message: t("zone.deleted") });
  return;
});
