// src/modules/returns/public.controller.ts
import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { isValidObjectId } from "@/core/middleware/auth/validation";

/** POST /returns/public  { orderId, lines:[{itemIndex,qty,reason}], note? } */
export const createRMARequest = asyncHandler(async (req: Request, res: Response) => {
  const { ReturnRMA, Order } = await getTenantModels(req);
  const { orderId, lines, note } = req.body as {
    orderId: string;
    lines: Array<{ itemIndex: number; qty?: number; quantity?: number; reason?: string }>;
    note?: string;
  };

  if (!orderId || !isValidObjectId(orderId)) {
    res.status(400).json({ success: false, message: "invalid_order_id" });
    return;
  }
  if (!Array.isArray(lines) || lines.length === 0) {
    res.status(400).json({ success: false, message: "lines_required" });
    return;
  }

  // Order kontrolü (tenant + exists)
  const order = await Order.findOne({ _id: orderId, tenant: req.tenant }).lean();
  if (!order) { res.status(404).json({ success: false, message: "order_not_found" }); return; }

  const itemsAny = (order.items || []) as any[];
  const itemCount = itemsAny.length;

  // istek satırlarını normalize et
  const normalized = lines.map((l) => ({
    itemIndex: Number(l.itemIndex),
    qty: Number(l.qty ?? l.quantity ?? 0),
    reason: l.reason,
  }));

  // itemIndex & qty doğrulaması
  for (const l of normalized) {
    if (!Number.isInteger(l.itemIndex) || l.itemIndex < 0 || l.itemIndex >= itemCount) {
      res.status(400).json({ success: false, message: "invalid_item_index" }); return;
    }
    if (!(l.qty > 0)) {
      res.status(400).json({ success: false, message: "invalid_qty" }); return;
    }
    const lineAny = itemsAny[l.itemIndex] || {};
    // Order modelleri projeye göre qty veya quantity barındırabilir
    const maxQty = Number(lineAny.quantity ?? lineAny.qty ?? 0);
    if (l.qty > maxQty) {
      res.status(400).json({ success: false, message: "qty_exceeds_order_line" }); return;
    }
  }

  const payload: any = {
    tenant: req.tenant,
    order: orderId,
    user: (req as any).user?._id, // opsiyonel
    code: "", // pre('validate') üretecekse boş bırakılabilir
    lines: normalized,
    status: "requested",
    timeline: [{ at: new Date(), status: "requested", note }],
  };

  const doc = await ReturnRMA.create(payload);
  res.status(201).json({ success: true, message: "rma_requested", data: doc });
});

/** GET /returns/public/:code */
export const getRMAByCodePublic = asyncHandler(async (req: Request, res: Response) => {
  const { ReturnRMA } = await getTenantModels(req);
  const { code } = req.params;
  const doc = await ReturnRMA.findOne({ tenant: req.tenant, code: String(code).toUpperCase() })
    .populate("order", "orderNo status")
    .lean();
  if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }
  res.status(200).json({ success: true, data: doc });
});
