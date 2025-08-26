// src/modules/about/index.ts

import express from "express";
import webhooksRoutes from "./admin.routes";

const router = express.Router();

// 🌍 Public Routes
router.use("/", webhooksRoutes);



export default router;
