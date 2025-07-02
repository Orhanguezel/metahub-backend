// src/modules/about/index.ts

import express from "express";
import adminRoutes from "./admin.about.routes";
import publicRoutes from "./public.about.routes";
import  {About} from "./about.models";
import * as adminController from "./admin.about.controller";
import * as publicController from "./public.about.controller";
import * as validation from "./about.validation";

const router = express.Router();

// 🔐 Admin Routes
router.use("/admin", adminRoutes);

// 🌍 Public Routes
router.use("/", publicRoutes);



// ✅ Exports (standardized)
export {
  About,
  adminController,
  publicController,
  validation,
};

export default router;
