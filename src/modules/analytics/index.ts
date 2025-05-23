import express from "express";
import analyticsRoutes from "./analytics.routes";
import { Analytics } from "./analytics.models";
import * as analyticsController from "./analytics.controller";
import * as validation from "./analytics.validation";

const router = express.Router();

// 🌍 Analytics Routes (Tüm endpointler burada birleşir)
router.use("/", analyticsRoutes);

// ✅ Exports (standardized)
export {
  Analytics,
  analyticsController,
  validation,
};

export default router;
