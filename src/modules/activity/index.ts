// src/modules/Activity/index.ts
import express from "express";
import publicRoutes from "./public.activity.routes";
import adminRoutes from "./admin.activity.routes";
import  {Activity } from "./activity.models";
import * as publicActivityController from "./public.activity.controller";
import * as adminActivityController from "./admin.activity.controller";
import * as ActivityValidation from "./activity.validation";

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/", publicRoutes);

export {
  Activity,
  publicActivityController,
  adminActivityController,
  ActivityValidation,
};
export default router;
