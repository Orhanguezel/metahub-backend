import express from "express";

// ✅ Ana router
import moduleMetaRoutes from "./ moduleMeta.routes";
import moduleSettingRoutes from "./moduleSetting.routes";
import moduleMaintenanceRoutes from "./moduleMaintenance.routes";

// Tüm modül routerlarını ana router'a bağla
const router = express.Router();

// Sıralama önemli değil, mantıken gruplu yazıldı:
router.use("/meta", moduleMetaRoutes); // /modules/meta/...
router.use("/setting", moduleSettingRoutes); // /modules/setting/...
router.use("/maintenance", moduleMaintenanceRoutes); // /modules/maintenance/...

export default router;
