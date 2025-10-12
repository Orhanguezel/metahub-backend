import { Router } from "express";
import { authenticate } from "@/core/middleware/auth/authMiddleware";
import { validateRequest } from "@/core/middleware/validateRequest";
import {
  addToCart,
  getUserCart,
  increaseQuantity,
  decreaseQuantity,
  removeFromCart,
  clearCart,
  addCartLine,
  updateCartLine,
  removeCartLine,
  updateCartPricing,
  checkoutCart,
} from "./public.controller";
import {
  addToCartValidator,
  cartItemBodyValidator,
  cartLineCreateValidator,
  cartLineUpdateValidator,
  cartPricingValidator,
  cartLineParamValidator,
} from "./validation";

const router = Router();
router.use(authenticate);

router.get("/", getUserCart);
router.post("/add", addToCartValidator, validateRequest, addToCart);
router.patch("/increase", cartItemBodyValidator, validateRequest, increaseQuantity);
router.patch("/decrease", cartItemBodyValidator, validateRequest, decreaseQuantity);
router.patch("/remove", cartItemBodyValidator, validateRequest, removeFromCart);
router.delete("/clear", clearCart);

router.post("/items", cartLineCreateValidator, validateRequest, addCartLine);
router.patch("/items/:lineId", cartLineParamValidator, cartLineUpdateValidator, validateRequest, updateCartLine);
router.delete("/items/:lineId", cartLineParamValidator, validateRequest, removeCartLine);

router.patch("/pricing", cartPricingValidator, validateRequest, updateCartPricing);
router.post("/checkout", checkoutCart);

export default router;
