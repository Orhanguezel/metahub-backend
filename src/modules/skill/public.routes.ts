// src/modules/skill/public.skill.routes.ts
import express from "express";
import { getAllSkill, getSkillById, getSkillBySlug } from "./public.controller";
import { validateObjectId } from "./validation";

const router = express.Router();

// 🌿 Public Endpoints
router.get("/", getAllSkill);
router.get("/slug/:slug", getSkillBySlug);
router.get("/:id", validateObjectId("id"), getSkillById);

export default router;
