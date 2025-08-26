// src/modules/about/index.ts

import express from "express";
import promotionRoutes from "./routes";

const router = express.Router();
// 🌍 Public Routes
router.use("/", promotionRoutes);


export default router;
