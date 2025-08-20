import { Router } from "express";
import { getDashboardAll } from "./dashboard.controller";
import { getDashboardOverview } from "./dashboard.overview.controller";
import { getDashboardStats } from "./dashboard.stats.controller";
import { getDashboardCharts } from "./dashboard.chart.controller";
import { getDashboardLogs } from "./dashboard.log.controller";
import { getDashboardReport } from "./dashboard.report.controller";
import logger from "@/core/middleware/logger/logger";
import type { SupportedLocale } from "@/types/common";

// İsteğe bağlı: Tenant ve locale bağlamını zenginleştir
const setDashboardContext = (req: any, _res: any, next: any) => {
  // Locale – query > header(x-locale) > Accept-Language > default
  const qLng = (req.query.lang || req.query.locale || "").toString().split(",")[0].trim();
  const hLng = (req.headers["x-locale"] || req.headers["accept-language"] || "").toString().split(",")[0].trim();
  const locale = (qLng || hLng || "en") as SupportedLocale;
  req.locale = locale;

  // Debug amaçlı minimal giriş logu (controller’lar ayrıntılı logluyor)
  logger.withReq.debug(req, "[DASHBOARD] route hit", {
    module: "dashboard",
    path: req.originalUrl,
    method: req.method,
  });
  next();
};

const router = Router();
router.use(setDashboardContext);

/** v2 endpoints (tenant-aware controller’lar) */
router.get("/", getDashboardAll);
router.get("/overview", getDashboardOverview);
router.get("/stats", getDashboardStats);
router.get("/charts", getDashboardCharts); // v1 uyumluluk dataset
router.get("/logs", getDashboardLogs);
router.get("/report", getDashboardReport);

/** Opsiyonel: hızlı sağlık kontrolü */
router.get("/_health", (req, res) => {
  res.status(200).json({
    success: true,
    module: "dashboard",
    message: "ok",
    locale: (req as any).locale || "en",
    time: new Date().toISOString(),
  });
});

export default router;
