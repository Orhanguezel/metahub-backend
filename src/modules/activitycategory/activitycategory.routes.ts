import express from "express";
import {
  createActivityCategory,
  getAllActivityCategories,
  getActivityCategoryById,
  updateActivityCategory,
  deleteActivityCategory,
} from "./activitycategory.controller";
import {
  validateCreateActivityCategory,
  validateUpdateActivityCategory,
  validateObjectId,
} from "./activitycategory.validation";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";

const router = express.Router();

// 🌿 Public Routes
router.get("/", getAllActivityCategories);
router.get("/:id", validateObjectId("id"), getActivityCategoryById);

// 🔐 Admin Routes
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateCreateActivityCategory,
  createActivityCategory
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  validateUpdateActivityCategory,
  updateActivityCategory
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  deleteActivityCategory
);

export default router;
