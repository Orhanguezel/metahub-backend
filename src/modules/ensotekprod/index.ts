import express from "express";
import publicRoutes from "./public.ensotekprod.routes";
import adminRoutes from "./admin.ensotekprod.routes";
import { EnsotekProd } from "./ensotekprod.models";
import * as productController from "./public.ensotekprod.controller";
import * as adminProductController from "./admin.ensotekprod.controller";

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/", publicRoutes);

export { EnsotekProd, productController, adminProductController };
export default router;
