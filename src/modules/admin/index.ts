import express from "express";
import routes from "./admin.routes";

// ✅ Modeller ve Controller importları
import ModuleMeta from "./moduleMeta.model";
import ModuleSetting from "./moduleSettings.model";
import * as adminController from "./admin.controller";

// ✅ Router
const router = express.Router();
router.use("/", routes);

// ✅ Guard + Export (standart)
export { ModuleMeta, ModuleSetting, adminController };

// ✅ Type exportlar ayrı (TS için)
export type { IModuleMeta } from "./moduleMeta.model";
export type { IModuleSetting } from "./moduleSettings.model";
export * from "./admin.validation";

export default router;
