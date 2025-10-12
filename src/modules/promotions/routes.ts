import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  createPromotion,
  updatePromotion,
  adminGetPromotions,
  adminGetPromotionById,
  deletePromotion,
  changePromotionStatus,
  changePromotionPublish,
} from "./admin.controller";
import { evaluatePromotions, redeemPromotion } from "./public.controller";

import {
  validateCreatePromotion,
  validateUpdatePromotion,
  validateObjectId,
  validateAdminQuery,
  validateEvaluate,
  validateRedeem,
} from "./validation";

const router = express.Router();

/* ===== Public ===== */
router.post("/evaluate", validateEvaluate, evaluatePromotions);
router.post("/redeem", validateRedeem, redeemPromotion);

/* ===== Admin ===== */
router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/", validateAdminQuery, adminGetPromotions);
router.get("/:id", validateObjectId("id"), adminGetPromotionById);

router.post("/", validateCreatePromotion, createPromotion);
router.put("/:id", validateObjectId("id"), validateUpdatePromotion, updatePromotion);

router.patch("/:id/status", validateObjectId("id"), changePromotionStatus);
router.patch("/:id/publish", validateObjectId("id"), changePromotionPublish);

router.delete("/:id", validateObjectId("id"), deletePromotion);

export default router;
