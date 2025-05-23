import express from "express";
import * as analyticsController from "./analytics.controller";
import {
  validateCreateAnalyticsEvent,
  validateGetAnalyticsEvents,
  validateGetAnalyticsCount,
  validateGetEventTrends,
  validateDeleteAnalyticsEvents,
} from "./analytics.validation";

const router = express.Router();

// Yeni event kaydı (track)
router.post(
  "/events",
  validateCreateAnalyticsEvent,
  analyticsController.createAnalyticsEvent
);

// Event listesi (filtreli/liste)
router.get(
  "/events",
  validateGetAnalyticsEvents,
  analyticsController.getAnalyticsEvents
);

// Event count (filtreyle say)
router.get(
  "/count",
  validateGetAnalyticsCount,
  analyticsController.getAnalyticsCount
);

// Event trends (günlük/aylık breakdown)
router.get(
  "/trends",
  validateGetEventTrends,
  analyticsController.getEventTrends
);

// Event silme (temizlik için, opsiyonel)
router.delete(
  "/events",
  validateDeleteAnalyticsEvents,
  analyticsController.deleteAnalyticsEvents
);

export default router;
