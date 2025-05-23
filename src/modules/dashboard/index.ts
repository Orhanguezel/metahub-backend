import express from "express";
import dashboardRoutes from "./dashboard.routes";
import * as dashboardController from "./dashboard.controller";
import * as dashboardChartController from "./dashboard.chart.controller";
import * as dashboardReportController from "./dashboard.report.controller";
import * as dashboardOverviewController from "./dashboard.overview.controller";
import * as dashboardLogController from "./dashboard.log.controller";


const router = express.Router();

// 🚀 Ana dashboard rotaları
router.use("/", dashboardRoutes);

export {
  dashboardController,
  dashboardChartController,
  dashboardReportController,
  dashboardOverviewController,
  dashboardLogController,
};

export default router;
