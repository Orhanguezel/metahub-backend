import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

const toISO2 = (x: string) => String(x || "").trim().toUpperCase();

export const listZones = asyncHandler(async (req: Request, res: Response) => {
  const { ShippingGeoZone } = await getTenantModels(req);
  const filter: any = { tenant: req.tenant };
  if (typeof req.query.isActive === "string") filter.isActive = req.query.isActive === "true";
  const items = await ShippingGeoZone.find(filter).sort({ priority: -1, code: 1 }).lean();
  res.status(200).json({ success: true, message: "listFetched", data: items });
});

export const getZone = asyncHandler(async (req: Request, res: Response) => {
  const { ShippingGeoZone } = await getTenantModels(req);
  const doc = await ShippingGeoZone.findOne({ _id: req.params.id, tenant: req.tenant }).lean();
  if (!doc) { res.status(404).json({ success: false, message: "notFound" }); return; }
  res.status(200).json({ success: true, message: "fetched", data: doc });
});

export const createZone = asyncHandler(async (req: Request, res: Response) => {
  const { ShippingGeoZone } = await getTenantModels(req);
  const payload = { ...(req.body || {}) };
  payload.tenant = req.tenant;
  payload.code = String(payload.code || "").trim().toLowerCase();
  if (Array.isArray(payload.countries)) payload.countries = payload.countries.map(toISO2);
  const created = await ShippingGeoZone.create(payload);
  res.status(201).json({ success: true, message: "created", data: created });
});

export const updateZone = asyncHandler(async (req: Request, res: Response) => {
  const { ShippingGeoZone } = await getTenantModels(req);
  const doc = await ShippingGeoZone.findOne({ _id: req.params.id, tenant: req.tenant });
  if (!doc) { res.status(404).json({ success: false, message: "notFound" }); return; }
  const up = { ...(req.body || {}) };
  if (up.code) delete up.code; // code immutable
  if (Array.isArray(up.countries)) up.countries = up.countries.map(toISO2);
  Object.assign(doc, up);
  await doc.save();
  res.status(200).json({ success: true, message: "updated", data: doc.toJSON() });
});

export const deleteZone = asyncHandler(async (req: Request, res: Response) => {
  const { ShippingGeoZone } = await getTenantModels(req);
  const doc = await ShippingGeoZone.findOne({ _id: req.params.id, tenant: req.tenant });
  if (!doc) { res.status(404).json({ success: false, message: "notFound" }); return; }
  await doc.deleteOne();
  res.status(200).json({ success: true, message: "deleted" });
});
