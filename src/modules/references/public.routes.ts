import express from "express";
import {
  getAllReferences,
  getReferenceById,
  getReferenceBySlug,
} from "./public.controller";
import { validateObjectId } from "./validation";

const router = express.Router();

router.get("/", getAllReferences);
router.get("/slug/:slug", getReferenceBySlug);
router.get("/:id", validateObjectId("id"), getReferenceById);

export default router;
