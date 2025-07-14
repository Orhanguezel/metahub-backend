import express from "express";
import * as adminController from "./admin.controller";
import * as publicController from "./public.controller";
import * as validation from "./validation";
import { ChatMessage, ChatSession } from "./models";
import adminRoutes from "./admin.routes";
import publicRoutes from "./public.routes";

// 📦 Express Router
const router = express.Router();

// 🔐 Admin Routes (admin auth + role protected)
router.use("/admin", adminRoutes);

// 🌍 Public Routes (auth veya public erişim)
router.use("/", publicRoutes);

// ✅ Guard + Export (This module has been updated and is now standardized)
export { ChatMessage, ChatSession };
export { adminRoutes, publicRoutes };
export default router;
