// src/modules/references/public.references.routes.ts
import express from "express";
import {
  getAllReferences,
  getReferencesById,
  getReferencesBySlug,
} from "./public.controller";
import { validateObjectId } from "./validation";

const router = express.Router();

// 🌿 Public Endpoints
router.get("/", getAllReferences);
router.get("/slug/:slug", getReferencesBySlug);
router.get("/:id", validateObjectId("id"), getReferencesById);

export default router;
