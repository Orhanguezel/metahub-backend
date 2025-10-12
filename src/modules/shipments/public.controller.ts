import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

/** GET /shipments/public/track/:trackingNo */
export const trackByTrackingNo = asyncHandler(async (req: Request, res: Response) => {
  const { Shipment } = await getTenantModels(req);
  const { trackingNo } = req.params;

  const doc = await Shipment.findOne({ tenant: req.tenant, trackingNumber: trackingNo })
    .select("trackingNumber status carrier estimatedDelivery recipientName events createdAt updatedAt")
    .lean();

  if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }
  res.status(200).json({ success: true, data: doc });
});
