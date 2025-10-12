import express from "express";

// Intent/webhook/capture/refund (public)
import intentsPublicRoutes from "./public.routes";

// Admin – Gateways
import gatewaysAdminRoutes from "./gateway/admin.routes";

// Admin – Outbound Webhooks
import webhooksAdminRoutes from "./webhooks/admin.routes";

// ✅ Checkout (fiyat hesap + opsiyonel intent)
import checkoutRoutes from "./checkout/routes";

const router = express.Router();

/* ========== ADMIN ========== */
router.use("/admin/gateways", gatewaysAdminRoutes);
router.use("/admin/webhooks", webhooksAdminRoutes);

/* ========== PUBLIC ========== */
/**
 * NAMESPACES:
 *  - /payments/checkout  → createCheckout (toplamlar + opsiyonel intent)
 *  - /payments/intents   → intent.controller (checkout, webhook, capture, refund)
 */
router.use("/checkout", checkoutRoutes);
router.use("/intents", intentsPublicRoutes);

export default router;
