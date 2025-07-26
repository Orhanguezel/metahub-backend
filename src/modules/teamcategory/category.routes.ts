import express from "express";
import {
  createTeamCategory,
  getAllTeamCategories,
  getTeamCategoryById,
  updateTeamCategory,
  deleteTeamCategory,
} from "./category.controller";
import {
  validateCreateTeamCategory,
  validateUpdateTeamCategory,
  validateObjectId,
} from "./category.validation";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";

const router = express.Router();

// 🌿 Public Routes
router.get("/", getAllTeamCategories);
router.get("/:id", validateObjectId("id"), getTeamCategoryById);

// 🔐 Admin Routes
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateCreateTeamCategory,
  createTeamCategory
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  validateUpdateTeamCategory,
  updateTeamCategory
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  deleteTeamCategory
);

export default router;
