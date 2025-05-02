import { Router } from "express";
import {
  getUserWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
} from "./wishlist.controller";
import { authenticate } from "@/core/middleware/authMiddleware";
import { validateProductIdParam } from "./wishlist.validation";

const router = Router();

// 🔐 All wishlist actions require auth
router.use(authenticate);

// 📋 Get user's wishlist
router.get("/", getUserWishlist);

// ➕ Add product to wishlist
router.post("/add/:productId", validateProductIdParam, addToWishlist);

// ❌ Remove product from wishlist
router.delete("/remove/:productId", validateProductIdParam, removeFromWishlist);

// 🧹 Clear the entire wishlist
router.delete("/clear", clearWishlist);

export default router;
