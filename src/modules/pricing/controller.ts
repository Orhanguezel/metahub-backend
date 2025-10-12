// src/modules/pricing/controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { computePricing } from "./service";
import type { PricingInput } from "./types";

export const getQuote = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const m = await getTenantModels(req);
  const input = req.body as Omit<PricingInput, "tenant">;
  const out = await computePricing(
    { ShippingMethod: m.ShippingMethod, FeeRule: m.FeeRule, Coupon: m.Coupon },
    { ...input, tenant: req.tenant! }
  );
  res.status(200).json({ success: true, data: out });
  return;
});
