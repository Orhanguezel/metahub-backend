import express from "express";
import {
  getAllRadonarProd,
  getRadonarProdBySlug,
  getRadonarProdById,
} from "./public.radonar.prod.controller";
import {
  validatePublicProductQuery,
  validateObjectId,
} from "./radonar.prod.validation";

const router = express.Router();

// 🌍 Public product listing
router.get("/", validatePublicProductQuery, getAllRadonarProd);

// 🌍 Get by Slug (before :id!)
router.get("/slug/:slug", getRadonarProdBySlug);

// 🌍 Get by ID
router.get("/:id", validateObjectId("id"), getRadonarProdById);

export { router as publicRadonarProdRoutes };
export default router;
