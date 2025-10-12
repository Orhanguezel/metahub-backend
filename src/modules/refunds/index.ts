import express from "express";
import adminRoutes from "./admin.routes";

const router = express.Router();
router.use("/admin", adminRoutes);

export default router;
