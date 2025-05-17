import express from "express";
import {
  getAllEnsotekProd,
  getEnsotekProdById,
  getEnsotekProdBySlug
} from "./public.ensotek.prod.controller";

import {
  validateObjectId,
  validatePublicProductQuery
} from "./ensotek.prod.validation";

const publicRouter = express.Router();

// ✅ Public Routes
publicRouter.get("/", validatePublicProductQuery, getAllEnsotekProd);
publicRouter.get("/slug/:slug", getEnsotekProdBySlug); // slug önce gelmeli!
publicRouter.get("/:id", validateObjectId("id"), getEnsotekProdById);

export { publicRouter as publicEnsotekProdRoutes };
export default publicRouter;
