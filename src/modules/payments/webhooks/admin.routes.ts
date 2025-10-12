import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  createEndpoint, updateEndpoint, listEndpoints, getEndpointById, deleteEndpoint,
  listDeliveries, getDeliveryById, retryDelivery, sendTestEvent,
} from "./admin.controller";
import { handleWebhook } from "../intents/intent.controller";
import {
  validateObjectId, validateCreateEndpoint, validateUpdateEndpoint,
  validateEndpointListQuery, validateDeliveryListQuery, validateRetryDelivery, validateTestSend
} from "./validation";

const router = express.Router();
router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/endpoints", validateEndpointListQuery, listEndpoints);
router.get("/endpoints/:id", validateObjectId("id"), getEndpointById);
router.post("/endpoints", validateCreateEndpoint, createEndpoint);
router.put("/endpoints/:id", validateObjectId("id"), validateUpdateEndpoint, updateEndpoint);
router.delete("/endpoints/:id", validateObjectId("id"), deleteEndpoint);

router.get("/deliveries", validateDeliveryListQuery, listDeliveries);
router.get("/deliveries/:id", validateObjectId("id"), getDeliveryById);
router.post("/deliveries/:id/retry", validateRetryDelivery, retryDelivery);

router.post("/test", validateTestSend, sendTestEvent);

// Admin’de debug amaçlı proxy; prod webhooks için public route’u tercih edin.
// (Adapter’ler raw body gerektirebilir; admin middleware’leri JSON parse etmişse imza doğrulaması atlanır.)
router.post("/webhooks/:provider", handleWebhook);

export default router;
