import express from "express";
import adminRoutes from "./admin.routes";
import publicRoutes from "./public.routes";

const router = express.Router();

// Admin (RBAC aşağıdaki route dosyasında)
router.use("/admin", adminRoutes);

// Public tracking (auth yok)
router.use("/public", publicRoutes);

export default router;
