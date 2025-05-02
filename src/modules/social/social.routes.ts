import express from "express";
import {
  getAllSocialLinks,
  getSocialLinkById,
  createSocialLink,
  updateSocialLink,
  deleteSocialLink,
} from "./social.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateCreateSocialLink,
  validateUpdateSocialLink,
  validateSocialId,
} from "./social.validation";

const router = express.Router();

// Public Routes
router.get("/", getAllSocialLinks);
router.get("/:id", validateSocialId, getSocialLinkById);

// Admin Routes
router.post("/", authenticate, authorizeRoles("admin"), validateCreateSocialLink, createSocialLink);
router.put("/:id", authenticate, authorizeRoles("admin"), validateSocialId, validateUpdateSocialLink, updateSocialLink);
router.delete("/:id", authenticate, authorizeRoles("admin"), validateSocialId, deleteSocialLink);

export default router;
