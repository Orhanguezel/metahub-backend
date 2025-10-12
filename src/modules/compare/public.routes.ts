import express from "express";
import {
  getMyCompare,
  addCompareItem,
  removeCompareItem,
  clearMyCompare,
  mergeCompare,
} from "./public.controller";
import {
  validateAddItem,
  validateRemoveItem,
  validateOwnerOptional,
  validateMerge,
} from "./validation";
import { authenticate } from "@/core/middleware/auth/authMiddleware";

const router = express.Router();

/**
 * Opsiyonel auth: Authorization: Bearer ... varsa authenticate çalışsın,
 * yoksa next() ile devam edilsin.
 */
const authenticateOptional: express.RequestHandler = (req, res, next) => {
  const hdr = (req.get("authorization") || req.headers.authorization || "") as string;
  if (hdr && /^bearer\s+/i.test(hdr)) {
    // authenticate middleware normal (req, res, next) imzasında olduğundan çağırabiliriz
    return (authenticate as any)(req, res, next);
  }
  return next();
};

// Public uçlarda opsiyonel auth
router.use(authenticateOptional);

/* Mevcut kullanıcının/oturumun compare listesi */
router.get("/me", validateOwnerOptional, getMyCompare);

/* Ekle/çıkar/temizle */
router.post("/items", validateAddItem, addCompareItem);
router.delete("/items", validateRemoveItem, removeCompareItem);
router.delete("/clear", validateOwnerOptional, clearMyCompare);

/* Guest → User merge (login sonrası) — burada auth zorunlu */
router.post("/merge", authenticate, validateMerge, mergeCompare);

export default router;
