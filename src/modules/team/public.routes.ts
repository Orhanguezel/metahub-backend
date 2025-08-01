// src/modules/team/public.team.routes.ts
import express from "express";
import {
  getAllTeam,
  getTeamById,
  getTeamBySlug,
} from "./public.controller";
import { validateObjectId } from "./validation";

const router = express.Router();

// 🌿 Public Endpoints
router.get("/", getAllTeam);
router.get("/slug/:slug", getTeamBySlug);
router.get("/:id", validateObjectId("id"), getTeamById);

export default router;
