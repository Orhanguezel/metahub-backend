import express from "express";
import routes from "./dashboard.routes";

const router = express.Router();
router.use("/", routes);

export * from "./dashboard.controller";
export * from "./dashboard.chart.controller";
export * from "./dashboard.log.controller";
export * from "./dashboard.overview.controller";
export * from "./dashboard.report.controller";

export default router;
