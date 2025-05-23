import express from "express";
import publicRoutes from "./product.routes";
import adminRoutes from "./admin.product.routes";
import { Product } from "./product.models";
import * as productController from "./product.controller";
import * as adminProductController from "./admin.product.controller";

const router = express.Router();

router.use("/", publicRoutes);

router.use("/admin", adminRoutes);

export { Product, productController, adminProductController };
export default router;
