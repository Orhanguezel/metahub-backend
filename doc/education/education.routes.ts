import express, { Request, Response, NextFunction } from "express";
import {
  getAllEducation,
  getEducationById,
  createEducation,
  updateEducation,
  deleteEducation,
} from "./education.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateCreateEducation,
  validateUpdateEducation,
  validateEducationIdParam,
} from "./education.validation";

const router = express.Router();

// ✅ Public Routes
router.get("/", getAllEducation);
router.get("/:id", validateEducationIdParam, getEducationById);

// ✅ Admin Routes
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateCreateEducation,
  createEducation
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateEducationIdParam,
  validateUpdateEducation,
  updateEducation
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateEducationIdParam,
  deleteEducation
);

export default router;
