import express from "express";
import { getAllSocialLinks, createSocialLink } from "./social.controller";
import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";

const router = express.Router();

// Public Route
router.get("/", getAllSocialLinks);

// Admin Route
router.post("/", authenticate, authorizeRoles("admin"), createSocialLink);

export default router;
