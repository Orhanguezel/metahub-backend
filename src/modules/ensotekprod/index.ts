import express from "express";
import publicRoutes from "./public.routes";
import adminRoutes from "./admin.routes";
import { Ensotekprod } from "./models";
import * as productController from "./public.controller";
import * as adminProductController from "./admin.controller";
import * as ensotekprodTypes from "../ensotekprod/types";

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/", publicRoutes);

export {
  Ensotekprod,
  productController,
  adminProductController,
  ensotekprodTypes,
};

export default router;
