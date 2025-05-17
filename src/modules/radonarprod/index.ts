import express from "express";
import publicRoutes from "./public.radonar.prod.routes";
import adminRoutes from "./admin.radonar.prod.routes";
import { RadonarProd, IRadonarProd } from "./radonar.prod.model";
import * as productController from "./public.radonar.prod.controller";
import * as adminProductController from "./admin.radonar.prod.controller";

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/", publicRoutes);

export { RadonarProd, IRadonarProd, productController, adminProductController };
export default router;
