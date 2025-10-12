// src/modules/services/index.ts

import express from "express";
import adminRoutes from "./admin.routes";
import publicRoutes from "./public.routes";

const router = express.Router();

// 🔐 Admin Routes
router.use("/admin", adminRoutes);

// 🌍 Public Routes
router.use("/", publicRoutes);

export default router;
