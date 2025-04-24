// src/modules/dashboard/index.ts

import express from "express";
import dashboardRoutes from "./dashboard.routes";

const router = express.Router();

router.use("/", dashboardRoutes);

export * from "./dashboard.controller";
export * from "./dashboard.chart.controller";
export * from "./dashboard.report.controller";
export * from "./dashboard.overview.controller";
export * from "./dashboard.log.controller";

export default router;
