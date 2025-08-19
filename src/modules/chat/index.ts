import express from "express";
import adminRoutes from "./admin.routes";
import publicRoutes from "./public.routes";

// 📦 Express Router
const router = express.Router();

// 🔐 Admin Routes (admin auth + role protected)
router.use("/admin", adminRoutes);

// 🌍 Public Routes (auth veya public erişim)
router.use("/", publicRoutes);

export default router;
