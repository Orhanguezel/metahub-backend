import express from "express";
import {
  getAllSparepart,
  getSparepartBySlug,
  getSparepartById,
} from "./public.controller";
import { validatePublicProductQuery, validateObjectId } from "./validation";

const router = express.Router();

// 🌍 Public product listing
router.get("/", validatePublicProductQuery, getAllSparepart);

// 🌍 Get by Slug (before :id!)
router.get("/slug/:slug", getSparepartBySlug);

// 🌍 Get by ID
router.get("/:id", validateObjectId("id"), getSparepartById);

export { router as publicSparepartRoutes };
export default router;
