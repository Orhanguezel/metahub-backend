import express from "express";
import {
  createFeedback,
  getAllFeedbacks,
  togglePublishFeedback,
  deleteFeedback,
  updateFeedback,
  getPublishedFeedbacks,
  softDeleteFeedback,
} from "./feedback.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateCreateFeedback,
  validateUpdateFeedback,
  validateFeedbackId,
} from "./feedback.validation";

const router = express.Router();

// Public
router.post("/", validateCreateFeedback, createFeedback);
router.get("/published", getPublishedFeedbacks);

// Admin
router.use(authenticate, authorizeRoles("admin"));
router.get("/", getAllFeedbacks);
router.patch("/:id/toggle", validateFeedbackId, togglePublishFeedback);
router.put("/:id", validateFeedbackId, validateUpdateFeedback, updateFeedback);
router.delete("/:id", validateFeedbackId, deleteFeedback);
router.patch("/:id/archive", validateFeedbackId, softDeleteFeedback);

export default router;
