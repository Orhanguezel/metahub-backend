import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import {
  createShipmentForOrderNo,
  markLabelPrinted,
  markShipped,
  markDelivered,
  deleteIfAllowed,
} from "./service";

/** POST /shipments/admin/orders/:orderNo/shipments */
export const createForOrderNo = asyncHandler(async (req: Request, res: Response) => {
  const models = await getTenantModels(req) as any;
  const doc = await createShipmentForOrderNo(req, models, req.params.orderNo, req.body || {});
  res.status(201).json({ success: true, message: "shipment_created", data: doc });
});

/** GET /shipments/admin/shipments */
export const listAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { Shipment } = await getTenantModels(req);
  const { status, carrier, q, from, to, page = "1", limit = "20" } = req.query as Record<string,string>;

  const filter: any = { tenant: req.tenant };
  if (status) filter.status = status;
  if (carrier) filter.carrier = carrier;
  if (q) filter.$or = [{ trackingNumber: { $regex: q, $options: "i" } }, { recipientName: { $regex: q, $options: "i" } }];
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const p = Math.max(1, parseInt(page || "1", 10));
  const l = Math.min(500, Math.max(1, parseInt(limit || "20", 10)));
  const [items, total] = await Promise.all([
    Shipment.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
    Shipment.countDocuments(filter),
  ]);
  res.status(200).json({ success: true, data: items, meta: { page: p, limit: l, total } });
});

/** GET /shipments/admin/shipments/:id */
export const getByIdAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { Shipment } = await getTenantModels(req);
  const doc = await Shipment.findOne({ _id: req.params.id, tenant: req.tenant }).lean();
  if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }
  res.status(200).json({ success: true, data: doc });
});

/** POST /shipments/admin/shipments/:id/label */
export const postLabelPrinted = asyncHandler(async (req: Request, res: Response) => {
  const models = await getTenantModels(req) as any;
  const doc = await markLabelPrinted(req, models, req.params.id, req.body?.labelUrl);
  res.status(200).json({ success: true, message: "label_printed", data: doc });
});

/** POST /shipments/admin/shipments/:id/mark-shipped */
export const postMarkShipped = asyncHandler(async (req: Request, res: Response) => {
  const models = await getTenantModels(req) as any;
  const doc = await markShipped(req, models, req.params.id, { trackingNumber: req.body?.trackingNumber, items: req.body?.items });
  res.status(200).json({ success: true, message: "marked_shipped", data: doc });
});

/** POST /shipments/admin/shipments/:id/mark-delivered */
export const postMarkDelivered = asyncHandler(async (req: Request, res: Response) => {
  const models = await getTenantModels(req) as any;
  const doc = await markDelivered(req, models, req.params.id);
  res.status(200).json({ success: true, message: "marked_delivered", data: doc });
});

/** DELETE /shipments/admin/shipments/:id */
export const delShipment = asyncHandler(async (req: Request, res: Response) => {
  const models = await getTenantModels(req) as any;
  await deleteIfAllowed(req, models, req.params.id);
  res.status(200).json({ success: true, message: "deleted" });
});
