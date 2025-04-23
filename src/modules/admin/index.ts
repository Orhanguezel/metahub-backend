import express from "express";
import routes from "./admin.routes";
const router = express.Router();
router.use("/", routes);
export * from "./admin.controller";
export * from "./admin.models";
export { default as ModuleSetting } from "./moduleSettings.model";
export { default as ModuleMetaModel } from "./moduleMeta.model";

export default router;