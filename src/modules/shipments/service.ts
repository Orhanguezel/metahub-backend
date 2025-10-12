import type { Model, Types } from "mongoose";
import type { Request } from "express";
import { emitWebhookEvent } from "@/modules/payments/webhooks";

type CtxModels = {
  Shipment: Model<any>;
  Order: Model<any>;
  Stockledger?: Model<any>;
};

const canDeleteStatuses = new Set(["pending", "packed"]);
const transitions: Record<string, string[]> = {
  pending: ["packed", "canceled"],
  packed: ["shipped", "canceled"],
  shipped: ["in_transit", "returned"],
  in_transit: ["out_for_delivery", "returned"],
  out_for_delivery: ["delivered", "returned"],
  delivered: ["returned"],
  returned: [],
  canceled: [],
};
const canTransition = (from: string, to: string) => transitions[from]?.includes(to) || false;

export async function createShipmentForOrderNo(
  req: Request,
  models: CtxModels,
  orderNo: string,
  payload: {
    carrier?: string;
    recipientName?: string;
    trackingNumber?: string;
    packages?: any[]; // modelde saklamıyoruz; event.raw'da tutacağız
  }
) {
  const { Shipment, Order } = models;

  const order = await Order.findOne({ tenant: req.tenant, orderNo }).select("_id orderNo customer shipping");
  if (!order) throw Object.assign(new Error("order_not_found"), { status: 404 });

  const doc = await Shipment.create({
    tenant: req.tenant,
    order: order._id as Types.ObjectId,
    carrier: payload.carrier,
    recipientName: payload.recipientName || order?.shipping?.recipientName || "N/A",
    trackingNumber: payload.trackingNumber || "",
    status: "pending",
    events: [
      { at: new Date(), code: "created", desc: "Shipment created", raw: { packages: payload.packages || [] } },
    ],
  });

  // webhook: shipment.created
  await emitWebhookEvent(req, "order.status.changed", {
    topic: "shipment.created",
    shipmentId: String(doc._id),
    orderId: String(order._id),
    orderNo,
    carrier: payload.carrier,
    trackingNumber: payload.trackingNumber || "",
  }).catch(() => { /* non-blocking */ });

  return doc;
}

export async function markLabelPrinted(
  req: Request,
  models: CtxModels,
  id: string,
  labelUrl?: string
) {
  const { Shipment } = models;
  const doc = await Shipment.findOne({ _id: id, tenant: req.tenant });
  if (!doc) throw Object.assign(new Error("not_found"), { status: 404 });

  // Status "packed" evresine çekiyoruz (mevcut statülerde "label_printed" yok)
  if (doc.status !== "packed" && canTransition(doc.status, "packed")) {
    doc.status = "packed";
  }
  doc.events = [...(doc.events || []), { at: new Date(), code: "label_printed", desc: "Label printed", raw: { labelUrl } }];
  await doc.save();
  return doc.toJSON();
}

export async function markShipped(
  req: Request,
  models: CtxModels,
  id: string,
  input: { trackingNumber?: string; items?: Array<{ product?: string; qty?: number }> }
) {
  const { Shipment, Stockledger } = models;
  const doc = await Shipment.findOne({ _id: id, tenant: req.tenant });
  if (!doc) throw Object.assign(new Error("not_found"), { status: 404 });

  if (!canTransition(doc.status, "shipped")) {
    throw Object.assign(new Error("invalid_transition"), { status: 409 });
  }

  if (input?.trackingNumber) doc.trackingNumber = input.trackingNumber;
  doc.status = "shipped";
  doc.events = [...(doc.events || []), { at: new Date(), code: "shipped", desc: "Marked shipped", raw: { items: input?.items || [] } }];
  await doc.save();

  // stok defteri (opsiyonel): gönderilen kalemleri 'out' olarak yaz
  if (Stockledger && Array.isArray(input?.items) && input!.items.length > 0) {
    const tasks = input!.items
      .filter((x) => x?.product && Number(x?.qty) > 0)
      .map((x) =>
        Stockledger.create({
          tenant: req.tenant,
          product: x.product,
          type: "out",
          quantity: Number(x.qty),
          note: `shipment:${String(doc._id)}`,
          createdBy: (req as any).user?._id || null,
        })
      );
    await Promise.allSettled(tasks).catch(() => {});
  }

  await emitWebhookEvent(req, "order.status.changed", {
    topic: "shipment.shipped",
    shipmentId: String(doc._id),
    orderId: String(doc.order),
    carrier: doc.carrier,
    trackingNumber: doc.trackingNumber,
  }).catch(() => {});

  return doc.toJSON();
}

export async function markDelivered(
  req: Request,
  models: CtxModels,
  id: string
) {
  const { Shipment } = models;
  const doc = await Shipment.findOne({ _id: id, tenant: req.tenant });
  if (!doc) throw Object.assign(new Error("not_found"), { status: 404 });

  if (!canTransition(doc.status, "delivered")) {
    throw Object.assign(new Error("invalid_transition"), { status: 409 });
  }

  doc.status = "delivered";
  doc.events = [...(doc.events || []), { at: new Date(), code: "delivered", desc: "Delivered" }];
  doc.deliveredAt = new Date(); // modelinizde alan yoksa es geçilir
  await doc.save();

  await emitWebhookEvent(req, "order.status.changed", {
    topic: "shipment.delivered",
    shipmentId: String(doc._id),
    orderId: String(doc.order),
    carrier: doc.carrier,
    trackingNumber: doc.trackingNumber,
  }).catch(() => {});

  return doc.toJSON();
}

export async function deleteIfAllowed(req: Request, models: CtxModels, id: string) {
  const { Shipment } = models;
  const doc = await Shipment.findOne({ _id: id, tenant: req.tenant });
  if (!doc) throw Object.assign(new Error("not_found"), { status: 404 });

  if (!canDeleteStatuses.has(doc.status)) {
    throw Object.assign(new Error("cannot_delete_in_this_status"), { status: 409 });
  }
  await (doc as any).deleteOne();
  return true;
}
