import express from "express";
import {
  getAllSkills,
  createSkill,
  getSkillById,
  updateSkill,
  deleteSkill,
} from "./skill.controller";
import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";

const router = express.Router();

// Public Routes
router.get("/", getAllSkills);
router.get("/:id", getSkillById);

// Admin Routes
router.post("/", authenticate, authorizeRoles("admin"), createSkill);
router.put("/:id", authenticate, authorizeRoles("admin"), updateSkill);
router.delete("/:id", authenticate, authorizeRoles("admin"), deleteSkill);

export default router;
