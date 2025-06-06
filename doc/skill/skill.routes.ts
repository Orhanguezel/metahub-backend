import express from "express";
import {
  getAllSkills,
  createSkill,
  getSkillById,
  updateSkill,
  deleteSkill,
} from "./skill.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateCreateSkill,
  validateUpdateSkill,
  validateSkillId,
} from "./skill.validation";

const router = express.Router();

// Public Routes
router.get("/", getAllSkills);
router.get("/:id", validateSkillId, getSkillById);

// Admin Routes
router.post("/", authenticate, authorizeRoles("admin"), validateCreateSkill, createSkill);
router.put("/:id", authenticate, authorizeRoles("admin"), validateSkillId, validateUpdateSkill, updateSkill);
router.delete("/:id", authenticate, authorizeRoles("admin"), validateSkillId, deleteSkill);

export default router;
