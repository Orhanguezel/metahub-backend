import express from "express";
import routes from "./admin.routes";
import extraRoutes from "./admin.extras.routes";

// ✅ Modeller ve Controller importları
import { ModuleMeta, ModuleSetting } from "./admin.models";

import * as adminController from "./admin.controller";
import * as adminExtrasController from "./admin.module.extras.controller";

// ✅ Router
const router = express.Router();
router.use("/", routes, extraRoutes);

// ✅ Guard + Export (standart)
export { ModuleMeta, ModuleSetting, adminController };

export * from "./admin.validation";

export default router;
