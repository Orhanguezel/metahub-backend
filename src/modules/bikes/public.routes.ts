import express from "express";
import {
  getAllBike,
  getBikeBySlug,
  getBikeById,
} from "./public.controller";
import { validatePublicProductQuery, validateObjectId } from "./validation";

const router = express.Router();

// 🌍 Public product listing
router.get("/", validatePublicProductQuery, getAllBike);

// 🌍 Get by Slug (before :id!)
router.get("/slug/:slug", getBikeBySlug);

// 🌍 Get by ID
router.get("/:id", validateObjectId("id"), getBikeById);

export { router as publicBikeRoutes };
export default router;
