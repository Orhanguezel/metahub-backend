import express from "express";
import adminRoutes from "./admin.settings.routes";
import publicRoutes from "./public.settings.routes";
import { Settings } from "./settings.models";
import * as settingsAdminController from "./admin.settings.controller";
import * as settingsPublicController from "./public.settings.controller";

const router = express.Router();

// 🔐 Admin Routes
router.use("/admin", adminRoutes);

// 🌍 Public Routes
router.use("/", publicRoutes);

// ✅ Guard + Export (standart)
export { Settings, settingsAdminController, settingsPublicController };

export default router;
