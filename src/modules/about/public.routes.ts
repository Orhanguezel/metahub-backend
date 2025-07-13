// src/modules/about/public.about.routes.ts
import express from "express";
import { getAllAbout, getAboutById, getAboutBySlug } from "./public.controller";
import { validateObjectId } from "./validation";

const router = express.Router();

// 🌿 Public Endpoints
router.get("/", getAllAbout);
router.get("/slug/:slug", getAboutBySlug);
router.get("/:id", validateObjectId("id"), getAboutById);

export default router;
