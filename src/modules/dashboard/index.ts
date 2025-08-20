import express from "express";
import dashboardRoutes from "./dashboard.routes";


const router = express.Router();

// 🚀 Ana dashboard rotaları
router.use("/", dashboardRoutes);

export default router;
