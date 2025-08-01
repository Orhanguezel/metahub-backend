// src/modules/skill/index.ts

import express from "express";
import adminRoutes from "./admin.routes";
import publicRoutes from "./public.routes";
import { Skill } from "./models";
import * as adminController from "./admin.controller";
import * as publicController from "./public.controller";
import * as validation from "./validation";

const router = express.Router();

// 🔐 Admin Routes
router.use("/admin", adminRoutes);

// 🌍 Public Routes
router.use("/", publicRoutes);

// ✅ Exports (standardized)
export { Skill, adminController, publicController, validation };

export default router;
