// src/modules/about/public.about.routes.ts
import express from "express";
import { getAllAbout, getAboutById, getAboutBySlug } from "./public.controller";
import { validateObjectId, validatePublicQuery } from "./validation";

const router = express.Router();

router.get("/", validatePublicQuery, getAllAbout);
router.get("/slug/:slug", getAboutBySlug);
router.get("/:id", validateObjectId("id"), getAboutById);

export default router;
