// src/modules/activity/public.activity.routes.ts
import express from "express";
import {
  getAllActivity,
  getActivityById,
  getActivityBySlug,
} from "./public.activity.controller";
import { validateObjectId } from "./activity.validation";

const router = express.Router();

// 🌿 Public Endpoints
router.get("/", getAllActivity);
router.get("/slug/:slug", getActivityBySlug);
router.get("/:id", validateObjectId("id"), getActivityById);

export default router;
