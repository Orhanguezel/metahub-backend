import express from "express";
import routes from "./setting.routes";
import {Setting} from "./setting.models";
import * as settingController from "./setting.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Guard + Export (standart)
export { Setting };
export * from "./setting.controller";
export * from "./setting.validation";
export * from "./setting.models";
export * from "./setting.routes";

export default router;
