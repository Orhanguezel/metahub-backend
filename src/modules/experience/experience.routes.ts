import express from "express";
import {
  getAllExperiences,
  getExperienceById,
  createExperience,
  updateExperience,
  deleteExperience,
} from "./experience.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateCreateExperience,
  validateUpdateExperience,
  validateExperienceId,
} from "./experience.validation";

const router = express.Router();

// Public routes
router.get("/", getAllExperiences);
router.get("/:id", validateExperienceId, getExperienceById);

// Admin routes
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateCreateExperience,
  createExperience
);
router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateExperienceId,
  validateUpdateExperience,
  updateExperience
);
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateExperienceId,
  deleteExperience
);

export default router;
