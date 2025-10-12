// src/modules/returns/returns.admin.controller.ts
import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import type { RMAStatus } from "./types";
import { onRMAStatusChange } from "./bridge.service";

const canTransition = (from: RMAStatus, to: RMAStatus): boolean => {
  const map: Record<RMAStatus, RMAStatus[]> = {
    requested: ["approved","rejected","received"],
    approved:  ["received","refunded","closed"],
    received:  ["approved","refunded","closed","rejected"],
    refunded:  ["closed"],
    rejected:  ["closed"],
    closed:    [],
  };
  return map[from]?.includes(to) ?? false;
};

/** GET /returns/admin */
export const adminList = asyncHandler(async (req: Request, res: Response) => {
  const { ReturnRMA } = await getTenantModels(req);
  const { q, status, order, user, from, to, page = "1", limit = "20" } = req.query as Record<string,string>;

  const filter: any = { tenant: req.tenant };
  if (q) filter.code = { $regex: String(q).trim(), $options: "i" };
  if (status) filter.status = status;
  if (order) filter.order = order;
  if (user) filter.user = user;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const pg = Math.max(1, parseInt(page || "1", 10));
  const lm = Math.min(200, Math.max(1, parseInt(limit || "20", 10)));
  const skip = (pg - 1) * lm;

  const [items, total] = await Promise.all([
    ReturnRMA.find(filter)
      .populate("order", "orderNo status")
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(lm)
      .lean(),
    ReturnRMA.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data: items, meta: { page: pg, limit: lm, total } });
});

/** GET /returns/admin/:id */
export const adminGetById = asyncHandler(async (req: Request, res: Response) => {
  const { ReturnRMA } = await getTenantModels(req);
  const { id } = req.params;

  const doc = await ReturnRMA.findOne({ _id: id, tenant: req.tenant })
    .populate("order", "orderNo status items")
    .populate("user", "name email")
    .lean();
  if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }
  res.status(200).json({ success: true, data: doc });
});

/** PUT /returns/admin/:id/lines  (sadece requested iken değiştir) */
export const adminUpdateLines = asyncHandler(async (req: Request, res: Response) => {
  const { ReturnRMA, Order } = await getTenantModels(req);
  const { id } = req.params;
  const { lines } = req.body as { lines: Array<{ itemIndex: number; qty: number; reason?: string }> };

  const doc = await ReturnRMA.findOne({ _id: id, tenant: req.tenant });
  if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }
  if (doc.status !== "requested") {
    res.status(409).json({ success: false, message: "cannot_edit_lines_in_this_status" }); return;
  }

  const order = await Order.findOne({ _id: doc.order, tenant: req.tenant }).lean();
  const itemCount = Array.isArray(order?.items) ? order!.items.length : 0;
  for (const l of lines) {
    if (l.itemIndex < 0 || l.itemIndex >= itemCount) {
      res.status(400).json({ success: false, message: "invalid_item_index" }); return;
    }
    const maxQty = Number(order!.items[l.itemIndex]?.quantity || 0);
    if (l.qty > maxQty) { res.status(400).json({ success: false, message: "qty_exceeds_order_line" }); return; }
  }

  (doc as any).lines = lines;
  await (doc as any).save();

  res.status(200).json({ success: true, message: "lines_updated", data: doc });
});

/** PATCH /returns/admin/:id/status { status, note?, autoRefund? } */
export const adminChangeStatus = asyncHandler(async (req: Request, res: Response) => {
  const { ReturnRMA } = await getTenantModels(req);
  const { id } = req.params;
  const { status, note, autoRefund } = req.body as { status: RMAStatus; note?: string; autoRefund?: boolean };

  const doc = await ReturnRMA.findOne({ _id: id, tenant: req.tenant });
  if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }

  if (!canTransition(doc.status as RMAStatus, status)) {
    res.status(409).json({ success: false, message: "invalid_status_transition" }); return;
  }

  const prev = doc.status;
  (doc as any).status = status;
  (doc as any).timeline = [ ...(doc.timeline || []), { at: new Date(), status, note } ];
  await (doc as any).save();

  // ▶ Köprü: approve → restock (+ ops. refund)
  if (status === "approved") {
    try {
      await onRMAStatusChange(req, { rma: doc.toObject(), next: "approved", autoRefund: !!autoRefund, refundReason: note });
    } catch { /* swallow */ }
  }

  res.status(200).json({ success: true, message: "status_changed", data: doc });
});

/** POST /returns/admin/:id/note { note }  (status değiştirmeden timeline notu) */
export const adminAddNote = asyncHandler(async (req: Request, res: Response) => {
  const { ReturnRMA } = await getTenantModels(req);
  const { id } = req.params;
  const { note } = req.body as { note: string };

  const doc = await ReturnRMA.findOne({ _id: id, tenant: req.tenant });
  if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }

  (doc as any).timeline = [ ...(doc.timeline || []), { at: new Date(), status: doc.status, note } ];
  await (doc as any).save();

  res.status(200).json({ success: true, message: "note_added", data: doc });
});

/** DELETE /returns/admin/:id  (idempotent responses) */
export const adminDelete = asyncHandler(async (req: Request, res: Response) => {
  const { ReturnRMA } = await getTenantModels(req);
  const { id } = req.params;

  const doc = await ReturnRMA.findOne({ _id: id, tenant: req.tenant });
  if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }

  await (doc as any).deleteOne();
  res.status(200).json({ success: true, message: "deleted" });
});
