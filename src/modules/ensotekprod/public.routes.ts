import express from "express";
import {
  getAllEnsotekprod,
  getEnsotekprodBySlug,
  getEnsotekprodById,
} from "./public.controller";
import { validatePublicProductQuery, validateObjectId } from "./validation";

const router = express.Router();

// 🌍 Public product listing
router.get("/", validatePublicProductQuery, getAllEnsotekprod);

// 🌍 Get by Slug (before :id!)
router.get("/slug/:slug", getEnsotekprodBySlug);

// 🌍 Get by ID
router.get("/:id", validateObjectId("id"), getEnsotekprodById);

export { router as publicEnsotekprodRoutes };
export default router;
