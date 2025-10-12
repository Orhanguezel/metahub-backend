import express from "express";
import adminRoutes from "./admin.routes";
import publicRoutes from "./public.routes";

const router = express.Router();

// 🔐 Admin
router.use("/admin", adminRoutes);

// 🌍 Public
router.use("/", publicRoutes);

export default router;
