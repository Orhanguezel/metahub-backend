import { Router } from "express";
import { authenticate } from "@/core/middleware/authMiddleware";
import { validateRequest } from "@/core/middleware/validateRequest";
import { validateApiKey } from "@/core/middleware/validateApiKey";
import { analyticsLogger } from "@/core/middleware/analyticsLogger"; // ✅ Added

import {
  addToCart,
  getUserCart,
  increaseQuantity,
  decreaseQuantity,
  removeFromCart,
  clearCart,
} from "./cart.controller";

import {
  addToCartValidator,
  cartItemParamValidator,
} from "./cart.validation";

const router = Router();

router.use(authenticate, analyticsLogger); // ✅ Logger added here

router.get("/", validateApiKey, getUserCart);

router.post("/add", addToCartValidator, validateRequest, validateApiKey, addToCart);

router.patch("/increase/:productId", cartItemParamValidator, validateRequest, validateApiKey, increaseQuantity);

router.patch("/decrease/:productId", cartItemParamValidator, validateRequest, validateApiKey, decreaseQuantity);

router.delete("/remove/:productId", cartItemParamValidator, validateRequest, validateApiKey, removeFromCart);

router.delete("/clear", validateApiKey, clearCart);

export default router;
