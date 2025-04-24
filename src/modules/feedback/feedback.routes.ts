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
import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";

const router = express.Router();

router.post("/", createFeedback);
router.get("/", authenticate, authorizeRoles("admin"), getAllFeedbacks);
router.get("/published", getPublishedFeedbacks);
router.patch("/:id/toggle", authenticate, authorizeRoles("admin"), togglePublishFeedback);
router.put("/:id", authenticate, authorizeRoles("admin"), updateFeedback);
router.delete("/:id", authenticate, authorizeRoles("admin"), deleteFeedback);
router.patch("/:id/archive", authenticate, authorizeRoles("admin"), softDeleteFeedback);

export default router;
