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

router.get("/", authenticate, authorizeRoles("admin"), getDashboardStats);

// Grafikler
router.get(
  "/charts/orders",
  authenticate,
  authorizeRoles("admin"),
  validateChartQuery, // ✅ optional tarih filtresi
  getMonthlyOrders
);
router.get(
  "/charts/revenue",
  authenticate,
  authorizeRoles("admin"),
  validateChartQuery,
  getMonthlyRevenue
);

// Raporlar
router.get(
  "/reports/top-products",
  authenticate,
  authorizeRoles("admin"),
  validateReportQuery,
  getTopProducts
);
router.get(
  "/reports/user-roles",
  authenticate,
  authorizeRoles("admin"),
  validateReportQuery,
  getUserRoleStats
);

// Günlük özet
router.get("/daily-overview", authenticate, authorizeRoles("admin"), getDailyOverview);

// Analytics logları
router.get(
  "/logs",
  authenticate,
  authorizeRoles("admin"),
  validateGetAnalyticsLogs,
  getAnalyticsLogs
);

export default router;
