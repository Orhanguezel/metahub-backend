import express from "express";
import {
  createMassageCategory,
  getAllMassageCategories,
  getMassageCategoryById,
  updateMassageCategory,
  deleteMassageCategory,
} from "./category.controller";
import {
  validateCreateMassageCategory,
  validateUpdateMassageCategory,
  validateObjectId,
} from "./category.validation";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";

const router = express.Router();

// 🌿 Public Routes
router.get("/", getAllMassageCategories);
router.get("/:id", validateObjectId("id"), getMassageCategoryById);

// 🔐 Admin Routes
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateCreateMassageCategory,
  createMassageCategory
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  validateUpdateMassageCategory,
  updateMassageCategory
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  deleteMassageCategory
);

export default router;
