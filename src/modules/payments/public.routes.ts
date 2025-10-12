import express from "express";
import {
  createCheckoutIntent,
  handleWebhook,
  capturePayment,
  providerRefund,
} from "./intents/intent.controller";
import { validateRequest } from "@/core/middleware/validateRequest";

import {
  createCheckoutValidators,
  captureValidators,
  providerRefundValidators,
  webhookProviderParamValidator,
} from "./validators";

const router = express.Router();

/** Webhook için raw body gerekir (imza doğrulaması olan sağlayıcılar için) */
const rawJsonFallback: express.RequestHandler = (req, _res, next) => {
  if (Buffer.isBuffer(req.body)) {
    try { req.body = JSON.parse(req.body.toString("utf8")); } catch { /* ignore */ }
  }
  next();
};

/**
 * POST /api/.../payments/intents/checkout
 * Body: { provider, orderId?, amount?, currency?, method?, returnUrl?, cancelUrl?, customer?, items?, metadata?, ui_mode? }
 */
router.post(
  "/checkout",
  ...createCheckoutValidators,
  validateRequest,
  createCheckoutIntent
);

/**
 * POST /api/.../payments/intents/webhooks/:provider
 * İmza doğrulaması için raw body zorunlu.
 */
router.post(
  "/webhooks/:provider",
  ...webhookProviderParamValidator,
  validateRequest,
  express.raw({ type: "*/*" }),
  rawJsonFallback,
  handleWebhook
);

/** POST /api/.../payments/intents/capture */
router.post(
  "/capture",
  ...captureValidators,
  validateRequest,
  capturePayment
);

/** POST /api/.../payments/intents/refund/provider */
router.post(
  "/refund/provider",
  ...providerRefundValidators,
  validateRequest,
  providerRefund
);

export default router;
