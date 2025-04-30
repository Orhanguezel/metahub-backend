import express from "express";
import settingRoutes from "./setting.routes";
import Setting from "./setting.models";

const router = express.Router();

router.use("/", settingRoutes);

export * from "./setting.controller";
export { Setting };
export * from "./setting.models";
export default router;
