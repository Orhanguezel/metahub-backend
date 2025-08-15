// src/modules/activity/public.activity.routes.ts
import express from "express";
import { getAllActivity, getActivityById, getActivityBySlug } from "./public.controller";
import { validateObjectId, validatePublicQuery } from "./validation";

const router = express.Router();

router.get("/", validatePublicQuery, getAllActivity);
router.get("/slug/:slug", getActivityBySlug);
router.get("/:id", validateObjectId("id"), getActivityById);

export default router;
