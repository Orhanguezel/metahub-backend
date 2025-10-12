import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getAdapter, normalizeCreds } from "./index";
import type { PaymentProvider } from "../types/gateway.types";

const NEEDS: Record<PaymentProvider, (creds: Record<string, any>) => boolean> = {
  stripe:    (c) => !!(c.secretKey || c.apiKey),
  paypal:    (c) => !!(c.clientId && c.clientSecret),
  iyzico:    (c) => !!(c.apiKey && c.secretKey),
  paytr:     (c) => !!(c.merchantId && c.merchantKey && c.merchantSalt),
  craftgate: (c) => !!(c.apiKey && c.secretKey),
  papara:    (c) => !!(c.apiKey || c.clientId),
  paycell:   (c) => !!(c.merchantId && (c.apiKey || c.clientId)),
  manual:    (_) => true,
};

/** GET /api/v1/payments/gateways */
export const listGateways = asyncHandler(async (req: Request, res: Response) => {
  const { PaymentGateway } = await getTenantModels(req);
  const filter: Record<string, any> = { tenant: req.tenant };

  if (typeof req.query.provider === "string" && req.query.provider.trim()) {
    filter.provider = req.query.provider.trim();
  }
  if (typeof req.query.isActive === "string") {
    filter.isActive = req.query.isActive === "true";
  }

  const items = await PaymentGateway.find(filter).sort({ provider: 1 }).lean();
  res.json({ success: true, data: items });
});

/** GET /api/v1/payments/gateways/:id */
export const getGateway = asyncHandler(async (req: Request, res: Response) => {
  const { PaymentGateway } = await getTenantModels(req);
  const doc = await PaymentGateway.findOne({ _id: req.params.id, tenant: req.tenant }).lean();
  if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }
  res.json({ success: true, data: doc });
});

/** POST /api/v1/payments/gateways */
export const createGateway = asyncHandler(async (req: Request, res: Response) => {
  const { PaymentGateway } = await getTenantModels(req);
  const payload: any = { ...(req.body || {}) };

  payload.tenant = req.tenant;
  payload.credentials = normalizeCreds(payload.credentials || {});
  // backward compat: testMode → mode
  if (typeof payload.testMode === "boolean") {
    payload.mode = payload.testMode ? "test" : "live";
    delete payload.testMode;
  }

  const created = await PaymentGateway.create(payload);
  res.status(201).json({ success: true, data: created });
});

/** PUT /api/v1/payments/gateways/:id */
export const updateGateway = asyncHandler(async (req: Request, res: Response) => {
  const { PaymentGateway } = await getTenantModels(req);
  const doc = await PaymentGateway.findOne({ _id: req.params.id, tenant: req.tenant });
  if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }

  const up: any = { ...(req.body || {}) };
  if (up.credentials) up.credentials = normalizeCreds(up.credentials);
  if (typeof up.isActive === "boolean") (doc as any).isActive = up.isActive;
  if (typeof up.mode === "string") (doc as any).mode = up.mode;
  if (typeof up.testMode === "boolean") (doc as any).mode = up.testMode ? "test" : "live";
  if (up.title !== undefined) (doc as any).title = up.title;
  if (up.allowedMethods !== undefined) (doc as any).allowedMethods = up.allowedMethods;
  if (up.credentials !== undefined) (doc as any).credentials = up.credentials;

  await doc.save();
  res.json({ success: true, data: doc });
});

/** DELETE /api/v1/payments/gateways/:id */
export const deleteGateway = asyncHandler(async (req: Request, res: Response) => {
  const { PaymentGateway } = await getTenantModels(req);
  const doc = await PaymentGateway.findOne({ _id: req.params.id, tenant: req.tenant });
  if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }
  await doc.deleteOne();
  res.json({ success: true, message: "deleted" });
});

/** POST /api/v1/payments/gateways/:id/test */
export const testGateway = asyncHandler(async (req: Request, res: Response) => {
  const { PaymentGateway } = await getTenantModels(req);
  const doc = await PaymentGateway.findOne({ _id: req.params.id, tenant: req.tenant }).lean();
  if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }

  try {
    const provider = doc.provider as PaymentProvider;
    const adapter = getAdapter(provider);
    const creds = normalizeCreds(doc.credentials || {});
    const credentialsOk = NEEDS[provider]?.(creds) ?? false;

    res.json({
      success: true,
      data: {
        provider: adapter.name,
        credentialsOk,
        mode: doc.mode,
        expected: Object.keys(NEEDS),
      },
    });
  } catch (e: any) {
    res.status(400).json({ success: false, message: "adapter_init_failed", error: e?.message });
  }
});
