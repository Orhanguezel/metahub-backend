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
import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";

const router = express.Router();

router.route("/")
  .get(authenticate, authorizeRoles("admin"), fetchReviews)
  .post(authenticate, addReview);

router.route("/product/:productId")
  .get(fetchProductReviews)
  .delete(authenticate, authorizeRoles("admin"), deleteAllReviewsByProduct);

router.route("/user/:userId")
  .get(authenticate, authorizeRoles("admin"), getReviewsByUser);

router.route("/:id")
  .put(authenticate, updateReview)
  .delete(authenticate, deleteReview);

export default router;
