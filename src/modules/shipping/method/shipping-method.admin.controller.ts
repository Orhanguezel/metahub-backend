// src/modules/shipping/shipping-method.admin.controller.ts
import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "../i18n";
import { validateCalcConfig } from "./shipping-method.service";

const tReq = (req: Request, k: string, ns: "common" | "method" = "common") =>
  translate(`${ns}.${k}`, req.locale || getLogLocale(), translations);

export const listMethods = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { ShippingMethod } = await getTenantModels(req);
  const filter: any = { tenant: req.tenant };
  if (typeof req.query.active === "string") filter.active = req.query.active === "true";
  const items = await ShippingMethod.find(filter).sort({ order: 1, code: 1 }).lean();
  res.status(200).json({ success: true, message: tReq(req, "listFetched"), data: items });
  return;
});

export const getMethod = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { ShippingMethod } = await getTenantModels(req);
  const doc = await ShippingMethod.findOne({ _id: req.params.id, tenant: req.tenant }).lean();
  if (!doc) { res.status(404).json({ success: false, message: tReq(req, "notFound") }); return; }
  res.status(200).json({ success: true, message: tReq(req, "fetched"), data: doc });
  return;
});

export const createMethod = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { ShippingMethod } = await getTenantModels(req);
  const payload = { ...(req.body || {}) };
  payload.tenant = req.tenant;
  payload.code = String(payload.code || "").trim().toLowerCase();
  if (!validateCalcConfig(payload)) {
    res.status(400).json({ success: false, message: tReq(req, "invalidCalc", "method") });
    return;
  }
  const created = await ShippingMethod.create(payload);
  res.status(201).json({ success: true, message: tReq(req, "created"), data: created });
  return;
});

export const updateMethod = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { ShippingMethod } = await getTenantModels(req);
  const doc = await ShippingMethod.findOne({ _id: req.params.id, tenant: req.tenant });
  if (!doc) { res.status(404).json({ success: false, message: tReq(req, "notFound") }); return; }

  const up = { ...(req.body || {}) };
  if (up.code) delete up.code; // code değişmesine izin vermiyoruz
  if (up.calc || up.flatPrice_cents != null || up.freeOver_cents != null || up.table) {
    const check: any = { ...doc.toObject(), ...up };
    if (!validateCalcConfig(check)) {
      res.status(400).json({ success: false, message: tReq(req, "invalidCalc", "method") });
      return;
    }
  }
  Object.assign(doc, up);
  await doc.save();

  res.status(200).json({ success: true, message: tReq(req, "updated"), data: doc.toJSON() });
  return;
});

export const deleteMethod = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { ShippingMethod } = await getTenantModels(req);
  const doc = await ShippingMethod.findOne({ _id: req.params.id, tenant: req.tenant });
  if (!doc) { res.status(404).json({ success: false, message: tReq(req, "notFound") }); return; }
  await doc.deleteOne();
  res.status(200).json({ success: true, message: tReq(req, "deleted") });
  return;
});
