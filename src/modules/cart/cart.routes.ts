import { Router } from "express";
import { authenticate } from "@/core/middleware/authMiddleware";
import { validateRequest } from "@/core/middleware/validateRequest";

import {
  addToCart,
  getUserCart,
  increaseQuantity,
  decreaseQuantity,
  removeFromCart,
  clearCart,
} from "./cart.controller";

import { addToCartValidator, cartItemBodyValidator, } from "./cart.validation";

const router = Router();

router.use(authenticate);

router.get("/", getUserCart);

router.post("/add", addToCartValidator, validateRequest, addToCart);

router.patch(
  "/increase",
  cartItemBodyValidator,
  validateRequest,
  increaseQuantity
);

router.patch(
  "/decrease",
  cartItemBodyValidator,
  validateRequest,
  decreaseQuantity
);

router.patch(
  "/remove",
  cartItemBodyValidator,
  validateRequest,
  removeFromCart
);

router.delete("/clear", clearCart);

export default router;
