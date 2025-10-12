// src/modules/pricing/index.ts

import express from "express";
import publicRoutes from "./public.routes";

const router = express.Router();

// 🌍 Public Routes
router.use("/", publicRoutes);


export default router;
