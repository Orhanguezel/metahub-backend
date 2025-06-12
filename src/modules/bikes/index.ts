import express from "express";
import publicRoutes from "./public.routes";
import adminRoutes from "./admin.routes";
import { Bike } from "./model";
import * as productController from "./public.controller";
import * as adminProductController from "./admin.controller";
import * as bikeTypes from "../bikes/types";

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/", publicRoutes);

export { Bike, productController, adminProductController, bikeTypes };

export default router;
