import express from "express";
import publicRoutes from "./public.routes";
import adminRoutes from "./admin.routes";
import { Sparepart } from "./models";
import * as productController from "./public.controller";
import * as adminProductController from "./admin.controller";
import * as sparepartTypes from "../sparepart/types";

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/", publicRoutes);

export { Sparepart, productController, adminProductController, sparepartTypes };

export default router;
