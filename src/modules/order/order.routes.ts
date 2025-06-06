import express from "express";
import { createOrder, getOrderById, updateShippingAddress } from "./order.controller";
import { authenticate } from "@/core/middleware/authMiddleware";
import { createOrderValidator, updateShippingAddressValidator } from "./order.validation";
import { validateRequest } from "@/core/middleware/validateRequest";

const router = express.Router();


router.post("/", authenticate, createOrderValidator, validateRequest, createOrder);


router.get("/:id", authenticate, getOrderById);


router.put(
  "/:id/address",
  authenticate,
  updateShippingAddressValidator,
  validateRequest,
  updateShippingAddress
);

export default router;
