import express from "express";
import {
  getAllSocialLinks,
  getSocialLinkById,
  createSocialLink,
  updateSocialLink,
  deleteSocialLink,
} from "./social.controller";
import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";

const router = express.Router();

// 🌐 Public Routes
router.get("/", getAllSocialLinks);
router.get("/:id", getSocialLinkById);

// 🔐 Admin Routes
router.post("/", authenticate, authorizeRoles("admin"), createSocialLink);
router.put("/:id", authenticate, authorizeRoles("admin"), updateSocialLink);
router.delete("/:id", authenticate, authorizeRoles("admin"), deleteSocialLink);

export default router;
