import express from "express";
import publicRoutes from "./public.radonarprod.routes";
import adminRoutes from "./admin.radonarprod.routes";
import { RadonarProd } from "./radonarprod.model";
import * as productController from "./public.radonar.prod.controller";
import * as adminProductController from "./admin.radonar.prod.controller";
import * as radonarprodTypes from "./types"; 

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/", publicRoutes);


export {
  RadonarProd,
  productController,
  adminProductController,
  radonarprodTypes,
};

export default router;
