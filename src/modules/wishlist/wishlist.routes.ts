import { Router } from "express";
import {
  getUserWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
} from "./wishlist.controller";
import { authenticate } from "@/core/middleware/authMiddleware";
import { validateObjectId } from "@/core/middleware/validateRequest";

const router = Router();

// 🔒 Tüm wishlist işlemleri için authentication zorunlu
router.use(authenticate);

// 📋 Kullanıcının wishlist'ini getir
router.get("/", getUserWishlist);

// ➕ Ürün ekle
router.post("/add/:productId", validateObjectId("productId"), addToWishlist);

// ❌ Ürün çıkar
router.delete("/remove/:productId", validateObjectId("productId"), removeFromWishlist);

// 🧹 Tüm wishlist'i temizle
router.delete("/clear", clearWishlist);

export default router;
