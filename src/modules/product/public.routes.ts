import express from "express";
import rateLimit from "express-rate-limit";
import { publicListProducts, publicGetProductBySlug } from "./public.controller";
import { publicReportProduct } from "./public.report.controller";
import { validatePublicProductReport } from "./public.validation";

const reportLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20 }); // 20/saat/IP
const router = express.Router();

// x-tenant middleware zaten global
router.get("/", publicListProducts);
router.get("/slug/:slug", publicGetProductBySlug);

router.post(
  "/:id/report",
  reportLimiter,
  validatePublicProductReport,
  publicReportProduct
);

export default router;
