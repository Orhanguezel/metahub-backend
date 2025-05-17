import express from "express";
import publicRoutes from "./public.ensotek.prod.routes";
import adminRoutes from "./admin.ensotek.prod.routes";
import { EnsotekProd, IEnsotekProd } from "./ensotek.prod.model";
import * as productController from "./public.ensotek.prod.controller";
import * as adminProductController from "./admin.ensotek.prod.controller";

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/", publicRoutes);



export { EnsotekProd, IEnsotekProd, productController, adminProductController };
export default router;
