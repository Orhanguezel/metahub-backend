// src/modules/shipping/shipment.controller.ts
import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import type { ShipmentStatus } from "./types";
import { emitWebhookEvent } from "@/modules/payments/webhooks";

const tReq = (req: Request, k: string, ns: "common" | "shipment" = "common") =>
  translate(`${ns}.${k}`, req.locale || getLogLocale(), translations);

const ALLOWED_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  pending: ["packed", "canceled", "shipped"], // packed atlanabilir
  packed: ["shipped", "canceled"],
  shipped: ["in_transit", "returned", "delivered"], // bazı kargolar direkt delivered geçebilir
  in_transit: ["out_for_delivery", "returned", "delivered"],
  out_for_delivery: ["delivered", "returned"],
  delivered: ["returned"],
  returned: [],
  canceled: [],
};
const canTransition = (from: ShipmentStatus, to: ShipmentStatus) => ALLOWED_TRANSITIONS[from]?.includes(to);

/** helpers */
function sumPackageItemQtys(shipment: any): Array<{ orderItemId: string; qty: number }> {
  const acc = new Map<string, number>();
  for (const pkg of shipment.packages || []) {
    for (const it of pkg.items || []) {
      const k = String(it.orderItemId);
      acc.set(k, (acc.get(k) || 0) + Number(it.qty || 0));
    }
  }
  return Array.from(acc.entries()).map(([orderItemId, qty]) => ({ orderItemId, qty }));
}

/** GET /admin/shipments (aynı) */
export const listShipments = /* ... bıraktığın haliyle iyi ... */ asyncHandler(async (req, res) => {
  const { Shipment } = await getTenantModels(req);
  const { status, q, page = "1", limit = "20" } = req.query as Record<string, string>;
  const filter: any = { tenant: req.tenant };
  if (status) filter.status = status;
  if (q) filter.$or = [{ trackingNumber: { $regex: q, $options: "i" } }, { recipientName: { $regex: q, $options: "i" } }];
  const p = Math.max(1, parseInt(page, 10));
  const l = Math.min(500, Math.max(1, parseInt(limit, 10)));
  const [items, total] = await Promise.all([
    Shipment.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
    Shipment.countDocuments(filter),
  ]);
  res.status(200).json({ success: true, message: tReq(req, "listFetched", "shipment"), data: items, meta: { page: p, limit: l, total } });
});

/** GET /admin/shipments/:id (aynı) */
export const getShipmentById = /* ... */ asyncHandler(async (req, res) => {
  const { Shipment } = await getTenantModels(req);
  const doc = await Shipment.findOne({ _id: req.params.id, tenant: req.tenant }).lean();
  if (!doc) { res.status(404).json({ success: false, message: tReq(req, "notFound") }); return; }
  res.status(200).json({ success: true, message: tReq(req, "fetched", "shipment"), data: doc });
});



// … createShipment:
export const createShipment = asyncHandler(async (req, res) => {
  const { Shipment, Order } = await getTenantModels(req);
  const payload = { ...(req.body || {}) };
  const { order } = payload;

  const orderDoc = await Order.findOne({ _id: order, tenant: req.tenant }).select("_id items orderNo").lean();
  if (!orderDoc) { res.status(400).json({ success: false, message: "invalid_order_id" }); return; }

  payload.tenant = req.tenant;
  payload.events = [{ at: new Date(), code: "created" }];

  const created = await Shipment.create(payload);

  // ▶ Outbound event
  await emitWebhookEvent(req, "shipment.created", {
    shipmentId: String(created._id),
    orderId: String(orderDoc._id),
    status: created.status,
    trackingNumber: created.trackingNumber,
    carrier: created.carrier,
    createdAt: created.createdAt,
  });

  res.status(201).json({ success: true, message: tReq(req, "created", "shipment"), data: created });
});

// … markLabelPrinted:
export const markLabelPrinted = asyncHandler(async (req, res) => {
  const { Shipment } = await getTenantModels(req);
  const { trackingNumber, labelUrl } = req.body || {};
  const doc = await Shipment.findOne({ _id: req.params.id, tenant: req.tenant });
  if (!doc) { res.status(404).json({ success: false, message: tReq(req, "notFound") }); return; }

  if (!canTransition(doc.status as any, "packed")) {
    res.status(409).json({ success: false, message: tReq(req, "invalidTransition", "shipment") }); return;
  }

  if (trackingNumber) (doc as any).trackingNumber = trackingNumber;
  (doc as any).status = "packed";
  (doc as any).events = [...(doc as any).events, { at: new Date(), code: "label_printed" }];
  if (labelUrl) (doc as any).carrierDetails = { ...(doc as any).carrierDetails, labelUrl };

  await doc.save();

  await emitWebhookEvent(req, "shipment.status.changed", {
    shipmentId: String(doc._id),
    orderId: String(doc.order),
    status_from: "pending",
    status_to: "packed",
    trackingNumber: doc.trackingNumber,
    labelUrl,
  });

  res.status(200).json({ success: true, message: tReq(req, "updated"), data: doc.toJSON() });
});

// … markShipped:
export const markShipped = asyncHandler(async (req, res) => {
  const { Shipment, Order, Stockledger } = await getTenantModels(req);
  const { trackingNumber } = req.body || {};
  const doc = await Shipment.findOne({ _id: req.params.id, tenant: req.tenant });
  if (!doc) { res.status(404).json({ success: false, message: tReq(req, "notFound") }); return; }

  if (["shipped","in_transit","out_for_delivery","delivered","returned"].includes(doc.status)) {
    res.status(200).json({ success: true, message: "already_shipped", data: doc.toJSON() }); return;
  }
  const ok = canTransition(doc.status as any, "shipped");
  if (!ok) { res.status(409).json({ success: false, message: tReq(req, "invalidTransition", "shipment") }); return; }

  if (trackingNumber) (doc as any).trackingNumber = trackingNumber;

  const order = await Order.findOne({ _id: doc.order, tenant: req.tenant }).lean();
  const qtyByOrderItem = sumPackageItemQtys(doc.toObject());

  for (const row of qtyByOrderItem) {
    const item = (order as any)?.items?.find((x: any) => String(x._id) === String(row.orderItemId));
    const productId = item?.product;
    if (!productId || !row.qty) continue;
    await Stockledger.create({
      tenant: req.tenant,
      product: productId,
      type: "out",
      quantity: Number(row.qty),
      note: `shipment:${String(doc._id)}`,
      createdBy: (req as any).user?._id || null,
    });
  }

  const prev = doc.status;
  (doc as any).status = "shipped";
  (doc as any).events = [...(doc as any).events, { at: new Date(), code: "handover" }];
  await doc.save();

  await emitWebhookEvent(req, "shipment.status.changed", {
    shipmentId: String(doc._id),
    orderId: String(doc.order),
    status_from: prev,
    status_to: "shipped",
    trackingNumber: doc.trackingNumber,
    carrier: doc.carrier,
  });

  res.status(200).json({ success: true, message: tReq(req, "updated"), data: doc.toJSON() });
});

// … markDelivered:
export const markDelivered = asyncHandler(async (req, res) => {
  const { Shipment } = await getTenantModels(req);
  const doc = await Shipment.findOne({ _id: req.params.id, tenant: req.tenant });
  if (!doc) { res.status(404).json({ success: false, message: tReq(req, "notFound") }); return; }

  if (!["shipped","in_transit","out_for_delivery"].includes(doc.status)) {
    res.status(409).json({ success: false, message: tReq(req, "invalidTransition", "shipment") }); return;
  }

  const prev = doc.status;
  (doc as any).status = "delivered";
  (doc as any).events = [...(doc as any).events, { at: new Date(), code: "delivered" }];
  (doc as any).estimatedDelivery = (doc as any).estimatedDelivery || new Date();
  await doc.save();

  await emitWebhookEvent(req, "shipment.status.changed", {
    shipmentId: String(doc._id),
    orderId: String(doc.order),
    status_from: prev,
    status_to: "delivered",
    trackingNumber: doc.trackingNumber,
  });

  res.status(200).json({ success: true, message: tReq(req, "updated"), data: doc.toJSON() });
});

// … appendShipmentEvent:
export const appendShipmentEvent = asyncHandler(async (req, res) => {
  const { Shipment } = await getTenantModels(req);
  const { code, desc, location, raw } = req.body || {};
  const doc = await Shipment.findOneAndUpdate(
    { _id: req.params.id, tenant: req.tenant },
    { $push: { events: { at: new Date(), code, desc, location, raw } } },
    { new: true }
  ).lean();

  if (!doc) { res.status(404).json({ success: false, message: tReq(req, "notFound") }); return; }

  await emitWebhookEvent(req, "shipment.event.appended", {
    shipmentId: String(doc._id),
    orderId: String(doc.order),
    code, desc, location,
  });

  res.status(200).json({ success: true, message: tReq(req, "updated"), data: doc });
});


/** PUT /admin/shipments/:id — genel update (küçültülmüş) */
export const updateShipment = asyncHandler(async (req, res) => {
  const { Shipment } = await getTenantModels(req);
  const { status, ...rest } = req.body || {};
  const doc = await Shipment.findOne({ _id: req.params.id, tenant: req.tenant });
  if (!doc) { res.status(404).json({ success: false, message: tReq(req, "notFound") }); return; }

  if (status && status !== doc.status) {
    const ok = canTransition(doc.status as any, status as any);
    if (!ok) { res.status(409).json({ success: false, message: tReq(req, "invalidTransition", "shipment") }); return; }
    (doc as any).status = status;
    (doc as any).events = [...(doc as any).events, { at: new Date(), code: `status:${status}` }];
  }
  Object.assign(doc, rest);
  await doc.save();
  res.status(200).json({ success: true, message: tReq(req, "updated"), data: doc.toJSON() });
});




/** DELETE /admin/shipments/:id (aynı) */
export const deleteShipment = /* ... bıraktığın gibi ... */ asyncHandler(async (req, res) => {
  const { Shipment } = await getTenantModels(req);
  const doc = await Shipment.findOne({ _id: req.params.id, tenant: req.tenant });
  if (!doc) { res.status(404).json({ success: false, message: tReq(req, "notFound") }); return; }
  await doc.deleteOne();
  res.status(200).json({ success: true, message: tReq(req, "deleted") });
});


