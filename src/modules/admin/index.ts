import express from "express";
import routes from "./admin.routes";

const router = express.Router();
router.use("/", routes);

// Controller
export * from "./admin.controller";

// Tip tanımlamaları ve modeller
export * from "./admin.models";
export { default as ModuleMetaModel } from "./moduleMeta.model";
export { default as ModuleSetting } from "./moduleSettings.model";

// Varsayılan export (router)
export default router;
