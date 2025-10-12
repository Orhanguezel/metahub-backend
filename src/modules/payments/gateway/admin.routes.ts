import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import { validateRequest } from "@/core/middleware/validateRequest";

/* Controllers */
import {
  listGateways,
  getGateway,
  createGateway,
  updateGateway,
  deleteGateway,
  testGateway,
} from "../admin.controller";

/* Validators */
import {
  validateGatewayList,
  validateGatewayId,
  validateGatewayCreate,
  validateGatewayUpdate,
  validateGatewayTest,
} from "./gateways.admin.validation";

const router = express.Router();

/* Admin Guard */
router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/gateways", ...validateGatewayList, validateRequest, listGateways);
router.get("/gateways/:id", ...validateGatewayId, validateRequest, getGateway);
router.post("/gateways", ...validateGatewayCreate, validateRequest, createGateway);
router.put("/gateways/:id", ...validateGatewayId, ...validateGatewayUpdate, validateRequest, updateGateway);
router.delete("/gateways/:id", ...validateGatewayId, validateRequest, deleteGateway);
router.post("/gateways/:id/test", ...validateGatewayTest, validateRequest, testGateway);

export default router;
