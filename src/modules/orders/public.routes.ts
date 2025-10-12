import express from "express";
import {
  getOrderById,
  updateShippingAddress,
  getMyOrders,
} from "./public.controller";

import { createOrder } from "./public.create.controller";

import { authenticate } from "@/core/middleware/auth/authMiddleware";
import {
  createOrderValidator,
  updateShippingAddressValidator,
} from "./validation";
import { validateRequest } from "@/core/middleware/validateRequest";

const router = express.Router();

router.post(
  "/",
  authenticate,
  createOrderValidator,
  validateRequest,
  createOrder
);

router.get("/", authenticate, getMyOrders);
router.get("/:id", authenticate, getOrderById);

router.put(
  "/:id/address",
  authenticate,
  updateShippingAddressValidator,
  validateRequest,
  updateShippingAddress
);

export default router;
