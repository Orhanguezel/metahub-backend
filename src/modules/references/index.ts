// src/modules/references/index.ts

import express from "express";
import adminRoutes from "./admin.references.routes";
import publicRoutes from "./public.references.routes";
import { References } from "./references.models";
import * as adminController from "./admin.references.controller";
import * as publicController from "./public.references.controller";
import * as validation from "./references.validation";

const router = express.Router();

// 🔐 Admin Routes
router.use("/admin", adminRoutes);

// 🌍 Public Routes
router.use("/", publicRoutes);

// ✅ Exports (standardized)
export { References, adminController, publicController, validation };

export default router;
