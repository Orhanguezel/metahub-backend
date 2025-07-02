// src/modules/activity/index.ts

import express from "express";
import adminRoutes from "./admin.activity.routes";
import publicRoutes from "./public.activity.routes";
import { Activity } from "./activity.models";
import * as adminController from "./admin.activity.controller";
import * as publicController from "./public.activity.controller";
import * as validation from "./activity.validation";

const router = express.Router();

// 🔐 Admin Routes
router.use("/admin", adminRoutes);

// 🌍 Public Routes
router.use("/", publicRoutes);

// ✅ Exports (standardized)
export { Activity, adminController, publicController, validation };

export default router;
