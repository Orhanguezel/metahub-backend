import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  createEndpoint, updateEndpoint, listEndpoints, getEndpointById, deleteEndpoint,
  listDeliveries, getDeliveryById, retryDelivery, sendTestEvent,
} from "./admin.controller";
import {
  validateObjectId, validateCreateEndpoint, validateUpdateEndpoint,
  validateEndpointListQuery, validateDeliveryListQuery, validateRetryDelivery, validateTestSend
} from "./validation";

const router = express.Router();

// Admin auth
router.use(authenticate, authorizeRoles("admin", "moderator"));

// Endpoints
router.get("/endpoints", validateEndpointListQuery, listEndpoints);
router.get("/endpoints/:id", validateObjectId("id"), getEndpointById);
router.post("/endpoints", validateCreateEndpoint, createEndpoint);
router.put("/endpoints/:id", validateObjectId("id"), validateUpdateEndpoint, updateEndpoint);
router.delete("/endpoints/:id", validateObjectId("id"), deleteEndpoint);

// Deliveries (logs)
router.get("/deliveries", validateDeliveryListQuery, listDeliveries);
router.get("/deliveries/:id", validateObjectId("id"), getDeliveryById);
router.post("/deliveries/:id/retry", validateRetryDelivery, retryDelivery);

// Test send
router.post("/test", validateTestSend, sendTestEvent);

export default router;
