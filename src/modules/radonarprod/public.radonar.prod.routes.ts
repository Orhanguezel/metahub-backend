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

const publicRouter = express.Router();

// 🌍 Public product listing
publicRouter.get("/", validatePublicProductQuery, getAllRadonarProd);

// 🌍 Get by Slug (before :id!)
publicRouter.get("/slug/:slug", getRadonarProdBySlug);

// 🌍 Get by ID
publicRouter.get("/:id", validateObjectId("id"), getRadonarProdById);

export { publicRouter as publicRadonarProdRoutes };
export default publicRouter;
