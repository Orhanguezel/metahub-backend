import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validateRequest } from "@/core/middleware/validateRequest";
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
router.post("/evaluate", validateEvaluate, validateRequest, evaluatePromotions);
router.post("/redeem", validateRedeem, validateRequest, redeemPromotion);

/* ===== Admin ===== */
router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/", validateAdminQuery, adminGetPromotions);
router.get("/:id", validateObjectId("id"), adminGetPromotionById);

router.post("/", validateCreatePromotion, validateRequest, createPromotion);
router.put("/:id", validateObjectId("id"), validateUpdatePromotion, validateRequest, updatePromotion);

router.patch("/:id/status", validateObjectId("id"), validateRequest, changePromotionStatus);
router.patch("/:id/publish", validateObjectId("id"), validateRequest, changePromotionPublish);

router.delete("/:id", validateObjectId("id"), validateRequest, deletePromotion);

export default router;
