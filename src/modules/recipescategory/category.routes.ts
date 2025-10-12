import express from "express";
import {
  createRecipeCategory,
  getAllRecipeCategories,
  getRecipeCategoryById,
  updateRecipeCategory,
  deleteRecipeCategory,
} from "./category.controller";
import {
  validateCreateRecipeCategory,
  validateUpdateRecipeCategory,
  validateObjectId,
  validateListQuery,
} from "./validation";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";

const router = express.Router();

// 🌿 Public
router.get("/", validateListQuery, getAllRecipeCategories);
router.get("/:id", validateObjectId("id"), getRecipeCategoryById);

// 🔐 Admin
router.post("/", authenticate, authorizeRoles("admin"), validateCreateRecipeCategory, createRecipeCategory);
router.put("/:id", authenticate, authorizeRoles("admin"), validateObjectId("id"), validateUpdateRecipeCategory, updateRecipeCategory);
router.delete("/:id", authenticate, authorizeRoles("admin"), validateObjectId("id"), deleteRecipeCategory);

export default router;
