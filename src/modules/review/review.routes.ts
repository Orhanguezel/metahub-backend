import express from "express";
import {
  fetchReviews,
  fetchProductReviews,
  addReview,
  updateReview,
  deleteReview,
  getReviewsByUser,
  deleteAllReviewsByProduct,
} from "./review.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validateCreateReview, validateUpdateReview, validateObjectIdParam } from "./review.validation";

const router = express.Router();

// ✅ Admin tüm yorumları getir
router.get("/", authenticate, authorizeRoles("admin"), fetchReviews);

// ✅ Yeni yorum oluştur
router.post("/", authenticate, validateCreateReview, addReview);

// ✅ Ürünün tüm yorumları
router.get("/product/:productId", validateObjectIdParam("productId"), fetchProductReviews);

// ✅ Admin ürüne ait tüm yorumları sil
router.delete(
  "/product/:productId",
  authenticate,
  authorizeRoles("admin"),
  validateObjectIdParam("productId"),
  deleteAllReviewsByProduct
);

// ✅ Admin kullanıcının yorumları
router.get(
  "/user/:userId",
  authenticate,
  authorizeRoles("admin"),
  validateObjectIdParam("userId"),
  getReviewsByUser
);

// ✅ Yorumu güncelle + sil
router
  .route("/:id")
  .put(authenticate, validateObjectIdParam("id"), validateUpdateReview, updateReview)
  .delete(authenticate, validateObjectIdParam("id"), deleteReview);

export default router;
