import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { resolveZoneId } from "./resolve";

export const resolveZone = asyncHandler(async (req: Request, res: Response) => {
  const { ShippingGeoZone } = await getTenantModels(req);
  const { country, state, city, postal } = req.query as Record<string,string>;
  const zoneId = await resolveZoneId(req, ShippingGeoZone, { country, state, city, postal });
  if (!zoneId) { res.status(404).json({ success: false, message: "no_zone_match" }); return; }
  res.status(200).json({ success: true, message: "resolved", data: { zoneId } });
});
