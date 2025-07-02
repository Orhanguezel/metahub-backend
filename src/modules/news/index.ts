// src/modules/news/index.ts

import express from "express";
import adminRoutes from "./admin.news.routes";
import publicRoutes from "./public.news.routes";
import { News } from "./news.models";
import * as adminController from "./admin.news.controller";
import * as publicController from "./public.news.controller";
import * as validation from "./news.validation";

const router = express.Router();

// 🔐 Admin Routes
router.use("/admin", adminRoutes);

// 🌍 Public Routes
router.use("/", publicRoutes);

// ✅ Exports (standardized)
export { News, adminController, publicController, validation };

export default router;
