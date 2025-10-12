// src/modules/shipping/shipping-method.public.controller.ts
import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "../i18n";
import { computeQuoteCents } from "./shipping-method.service";
import type { IShippingMethod } from "../types"; // <-- IShippingMethod tipini içeren dosyadan import et

const tReq = (req: Request, k: string, ns: "common" | "method" = "common") =>
  translate(`${ns}.${k}`, req.locale || getLogLocale(), translations);

/** GET /public/shipping-methods?zoneId=...  (aktifleri döndürür) */
export const listActiveMethods = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { ShippingMethod } = await getTenantModels(req);
  const { zoneId } = req.query as { zoneId?: string };

  const filter: any = { tenant: req.tenant, active: true };
  if (zoneId) filter.$or = [{ zones: { $size: 0 } }, { zones: zoneId }];

  // Listelemede lean() kullanmak OK
  const rows = await ShippingMethod.find(filter).sort({ order: 1, code: 1 }).lean();
  res.status(200).json({ success: true, message: tReq(req, "listFetched"), data: rows });
});

/** POST /public/shipping-methods/quote { code, subtotal_cents, weight_grams?, zoneId? } */
export const quoteMethod = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { ShippingMethod } = await getTenantModels(req);
  const { code, subtotal_cents, weight_grams, zoneId } = req.body as {
    code: string;
    subtotal_cents: number;
    weight_grams?: number;
    zoneId?: string;
  };

  const filter: any = { tenant: req.tenant, code: String(code || "").toLowerCase(), active: true };
  if (zoneId) filter.$or = [{ zones: { $size: 0 } }, { zones: zoneId }];

  // ÖNEMLİ: lean() KULLANMA → Map alanı (name) korunur, IShippingMethod ile uyumlu olur
  const methodDoc = await ShippingMethod.findOne(filter);
  if (!methodDoc) {
    res.status(404).json({ success: false, message: tReq(req, "notFound") });
    return;
  }

  // TS uyumu için toObject() + cast; computeQuoteCents sadece sayısal alanları okuyor
  const method = methodDoc.toObject() as unknown as IShippingMethod;

  const price_cents = computeQuoteCents(method, {
    subtotal_cents: Number.isFinite(+subtotal_cents) ? +subtotal_cents : 0,
    weight_grams: Number.isFinite(+weight_grams!) ? +weight_grams! : undefined,
  });

  res.status(200).json({
    success: true,
    message: tReq(req, "quoteComputed", "method"),
    data: { code: method.code, currency: method.currency, price_cents },
  });
});

// …

/** GET /shipping/track/:trackingNo (public) */
export const trackShipmentPublic = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { Shipment } = await getTenantModels(req);
  const { trackingNo } = req.params as { trackingNo: string };

  const doc = await Shipment.findOne({ tenant: req.tenant, trackingNumber: String(trackingNo) })
    .select("trackingNumber status carrier carrierDetails estimatedDelivery events updatedAt createdAt")
    .lean();

  if (!doc) {
    res.status(404).json({ success: false, message: tReq(req, "notFound") });
    return;
  }

  // güvenli yanıt; PII yok
  res.status(200).json({
    success: true,
    message: tReq(req, "fetched"),
    data: doc,
  });
});

