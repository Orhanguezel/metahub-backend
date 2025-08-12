import express from "express";
import adminRoutes from "./admin.routes";
import publicRoutes from "./public.routes";

// 📦 Express Router
const router = express.Router();

// 🔐 Admin Routes
router.use("/admin", adminRoutes);

// 🌍 Public Routes
router.use("/", publicRoutes);


export default router;
