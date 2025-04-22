import express from "express";
import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";
import { getAnalyticsLogs } from "./dashboard.log.controller";


// Ana istatistikler
import { getDashboardStats } from "./dashboard.controller";

// Grafik verileri
import {
  getMonthlyOrders,
  getMonthlyRevenue,
} from "./dashboard.chart.controller";

// Rapor verileri
import {
  getTopProducts,
  getUserRoleStats,
} from "./dashboard.report.controller";

// Günlük özet
import { getDailyOverview } from "./dashboard.overview.controller";

const router = express.Router();

// 🔐 Admin yetkisi gerektiren tüm dashboard verileri

// Genel istatistikler
router.get("/", authenticate, authorizeRoles("admin"), getDashboardStats);

// Grafik: Aylık sipariş sayısı
router.get(
  "/charts/orders",
  authenticate,
  authorizeRoles("admin"),
  getMonthlyOrders
);

// Grafik: Aylık gelir
router.get(
  "/charts/revenue",
  authenticate,
  authorizeRoles("admin"),
  getMonthlyRevenue
);

// Rapor: En çok satılan ürünler
router.get(
  "/reports/top-products",
  authenticate,
  authorizeRoles("admin"),
  getTopProducts
);

// Rapor: Kullanıcı rol dağılımı
router.get(
  "/reports/user-roles",
  authenticate,
  authorizeRoles("admin"),
  getUserRoleStats
);

// Günlük özet
router.get(
  "/daily-overview",
  authenticate,
  authorizeRoles("admin"),
  getDailyOverview
);

// Günlük kayıtlar
router.get(
  "/logs",
  authenticate,
  authorizeRoles("admin"),
  getAnalyticsLogs
);


export default router;
