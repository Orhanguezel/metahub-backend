import express from "express";
import tenantsRoutes from "./tenants.routes";
import Tenants from "./tenants.model";
import * as tenantsController from "./tenants.controller";
import * as tenantsValidation from "./tenants.validation";

const router = express.Router();
router.use("/", tenantsRoutes);

export {
  Tenants,
  tenantsController,
  tenantsValidation
};

export default router;
