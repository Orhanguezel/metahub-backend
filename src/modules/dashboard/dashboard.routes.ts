import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { getAnalyticsLogs } from "./dashboard.log.controller";
import { getDashboardStats } from "./dashboard.controller";
import { getMonthlyOrders, getMonthlyRevenue } from "./dashboard.chart.controller";
import { getTopProducts, getUserRoleStats } from "./dashboard.report.controller";
import { getDailyOverview } from "./dashboard.overview.controller";

// ✅ VALIDATION
import {
  validateGetAnalyticsLogs,
  validateChartQuery,
  validateReportQuery,
} from "./dashboard.validation";

const router = express.Router();

// 🔐 Tüm dashboard endpointleri admin yetkisi ister
router.use(authenticate, authorizeRoles("admin"));

// Dashboard ana kartlar/statistik
router.get("/", getDashboardStats);

// Grafikler
router.get("/charts/orders", validateChartQuery, getMonthlyOrders);
router.get("/charts/revenue", validateChartQuery, getMonthlyRevenue);

// Raporlar
router.get("/reports/top-products", validateReportQuery, getTopProducts);
router.get("/reports/user-roles", validateReportQuery, getUserRoleStats);

// Günlük özet
router.get("/daily-overview", getDailyOverview);

// Analytics logları
router.get("/logs", validateGetAnalyticsLogs, getAnalyticsLogs);

export default router;
