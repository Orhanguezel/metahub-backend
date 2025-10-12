import express from "express";
import {
  createSkillCategory,
  getAllSkillCategories,
  getSkillCategoryById,
  updateSkillCategory,
  deleteSkillCategory,
} from "./category.controller";
import {
  validateCreateSkillCategory,
  validateUpdateSkillCategory,
  validateObjectId,
} from "./validation";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";

const router = express.Router();

// 🌿 Public Routes
router.get("/", getAllSkillCategories);
router.get("/:id", validateObjectId("id"), getSkillCategoryById);

// 🔐 Admin Routes
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateCreateSkillCategory,
  createSkillCategory
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  validateUpdateSkillCategory,
  updateSkillCategory
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  deleteSkillCategory
);

export default router;
