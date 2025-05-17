// src/modules/services/index.ts
import express from "express";
import publicRoutes from "./public.services.routes";
import adminRoutes from "./admin.services.routes";
import Services, { IServices } from "./services.models";
import * as publicServicesController from "./public.services.controller";
import * as adminServicesController from "./admin.services.controller";
import * as servicesValidation from "./services.validation";

const router = express.Router();


router.use("/admin", adminRoutes);
router.use("/", publicRoutes);


export { Services, IServices, publicServicesController, adminServicesController, servicesValidation };
export default router;
