import express from "express";
import {
  getMyWishlist,
  addWishlistItem,
  removeWishlistItem,
  clearMyWishlist,
  mergeWishlist,
} from "./public.controller";
import {
  validateAddItem,
  validateRemoveItem,
  validateOwnerOptional,
  validateMerge,
} from "./validation";
import { validateRequest } from "@/core/middleware/validateRequest";

const router = express.Router();

/* Mevcut kullanıcının/oturumun listesi */
router.get("/me", validateOwnerOptional, validateRequest, getMyWishlist);

/* Ekle/çıkar/temizle */
router.post("/items", validateAddItem, addWishlistItem);
router.delete("/items", validateRemoveItem, removeWishlistItem);
router.delete("/clear", validateOwnerOptional, clearMyWishlist);

/* Guest → User merge (login sonrası) */
router.post("/merge", validateMerge, mergeWishlist);

export default router;
