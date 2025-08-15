// src/modules/skill/public.skill.routes.ts
import express from "express";
import { getAllSkill, getSkillById, getSkillBySlug } from "./public.controller";
import { validateObjectId, validatePublicQuery } from "./validation";

const router = express.Router();

router.get("/", validatePublicQuery, getAllSkill);
router.get("/slug/:slug", getSkillBySlug);
router.get("/:id", validateObjectId("id"), getSkillById);

export default router;
