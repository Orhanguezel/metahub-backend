// src/modules/about/index.ts
import express from "express";
import publicRoutes from "./public.about.routes";
import adminRoutes from "./admin.about.routes";
import {About } from "./about.models";
import * as publicAboutController from "./public.about.controller";
import * as adminAboutController from "./admin.about.controller";
import * as AboutValidation from "./about.validation";

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/", publicRoutes);

export {
  About,
  publicAboutController,
  adminAboutController,
  AboutValidation,
};
export default router;
