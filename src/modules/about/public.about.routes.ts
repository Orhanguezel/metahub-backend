import express from "express";
import {
  getAllAbout,
  getAboutById,
  getAboutBySlug,
} from "./public.about.controller";
import { validateObjectId } from "./about.validation";

const router = express.Router();

// 🌐 Public endpoints
router.get("/", getAllAbout);
router.get("/slug/:slug", getAboutBySlug);
router.get("/:id", validateObjectId("id"), getAboutById);

export default router;
