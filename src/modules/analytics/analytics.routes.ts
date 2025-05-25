import express from "express";
import {
  createAnalyticsEvent,
  getAnalyticsEvents,
  getAnalyticsCount,
  getEventTrends,
  deleteAnalyticsEvents,
} from "./analytics.controller";
import {
  validateCreateAnalyticsEvent,
  validateGetAnalyticsEvents,
  validateGetAnalyticsCount,
  validateGetEventTrends,
  validateDeleteAnalyticsEvents,
} from "./analytics.validation";

const router = express.Router();

router.post(
  "/events",
  validateCreateAnalyticsEvent,createAnalyticsEvent
);

router.get(
  "/events",
  validateGetAnalyticsEvents,getAnalyticsEvents
);

router.get(
  "/count",
  validateGetAnalyticsCount,getAnalyticsCount
);

// Event trends (günlük/aylık breakdown)
router.get(
  "/trends",
  validateGetEventTrends,getEventTrends
);

// Event silme (temizlik için, opsiyonel)
router.delete(
  "/events",
  validateDeleteAnalyticsEvents,deleteAnalyticsEvents
);

export default router;
