import express from "express";
import publicRoutes from "./public.routes";
import adminRoutes from "./admin.routes";

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/", publicRoutes);

export default router;
