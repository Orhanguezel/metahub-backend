import express from "express";
import adminRoutes from "./admin.routes";
import publicRoutes from "./public.routes";


const router = express.Router();

// Admin panel erişimi
router.use("/admin", adminRoutes);

// Public erişim
router.use("/", publicRoutes);

export default router;
