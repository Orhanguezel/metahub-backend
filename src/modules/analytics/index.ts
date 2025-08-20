import express from "express";
import analyticsRoutes from "./analytics.routes";

const router = express.Router();


router.use("/", analyticsRoutes);

export default router;
