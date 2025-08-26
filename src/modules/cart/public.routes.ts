// modules/cart/public.routes.ts
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
  addCartLine,            // <-- eklendi (menu cart line)
  updateCartLine,         // <-- eklendi
  removeCartLine,         // <-- eklendi
  updateCartPricing,      // <-- eklendi (tip/fee/discount)
  checkoutCart,           // <-- eklendi
} from "./public.controller";

import {
  addToCartValidator,
  cartItemBodyValidator,
  cartLineCreateValidator,    // <-- eklendi
  cartLineUpdateValidator,    // <-- eklendi
  cartPricingValidator,       // <-- eklendi
  cartLineParamValidator,     // <-- eklendi
} from "./validation";

const router = Router();

router.use(authenticate);

/* Mevcut sepet uçları (legacy simple products) */
router.get("/", getUserCart);
router.post("/add", addToCartValidator, validateRequest, addToCart);
router.patch("/increase", cartItemBodyValidator, validateRequest, increaseQuantity);
router.patch("/decrease", cartItemBodyValidator, validateRequest, decreaseQuantity);
router.patch("/remove", cartItemBodyValidator, validateRequest, removeFromCart);
router.delete("/clear", clearCart);

/* Faz-1: menu cart line uçları */
router.post("/items", cartLineCreateValidator, validateRequest, addCartLine);
router.patch("/items/:lineId", cartLineParamValidator, cartLineUpdateValidator, validateRequest, updateCartLine);
router.delete("/items/:lineId", cartLineParamValidator, validateRequest, removeCartLine);

/* Pricing update & checkout */
router.patch("/pricing", cartPricingValidator, validateRequest, updateCartPricing);
router.post("/checkout", checkoutCart);

export default router;
