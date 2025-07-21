// src/modules/library/public.library.routes.ts
import express from "express";
import {
  getAllLibrary,
  getLibraryById,
  getLibraryBySlug,
} from "./public.controller";
import { validateObjectId } from "./validation";

const router = express.Router();

// 🌿 Public Endpoints
router.get("/", getAllLibrary);
router.get("/slug/:slug", getLibraryBySlug);
router.get("/:id", validateObjectId("id"), getLibraryById);

export default router;
