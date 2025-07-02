// src/modules/services/index.ts

import express from "express";
import adminRoutes from "./admin.services.routes";
import publicRoutes from "./public.services.routes";
import { Services } from "./services.models";
import * as adminController from "./admin.services.controller";
import * as publicController from "./public.services.controller";
import * as validation from "./services.validation";

const router = express.Router();

// 🔐 Admin Routes
router.use("/admin", adminRoutes);

// 🌍 Public Routes
router.use("/", publicRoutes);

// ✅ Exports (standardized)
export { Services, adminController, publicController, validation };

export default router;
