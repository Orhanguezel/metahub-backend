import express from "express";
import routes from "./admin.routes";

const router = express.Router();
router.use("/", routes);

export * from "./admin.controller";

export * from "./admin.models"; // 
export { default as ModuleMetaModel } from "./moduleMeta.model"; // DB meta kayıtları
export { default as ModuleSetting } from "./moduleSettings.model"; // Proje bazlı ayarlar

export default router;
