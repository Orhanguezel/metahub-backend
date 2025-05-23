import express from "express";
import routes from "./admin.routes";

// ✅ Modeller ve Controller importları
import { ModuleMeta, ModuleSetting } from "./admin.models";

import * as adminController from "./admin.controller";

// ✅ Router
const router = express.Router();
router.use("/", routes);

// ✅ Guard + Export (standart)
export { ModuleMeta, ModuleSetting, adminController };

export * from "./admin.validation";

export default router;
