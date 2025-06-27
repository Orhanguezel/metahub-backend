import express from "express";

// ✅ Tüm modeller (tek yerden export!)
import { ModuleMeta, ModuleSetting } from "./admin.models";

// ✅ Tüm controller exportları (isteğe bağlı; genelde direkt kullanılmaz)
export * from "./moduleMeta.controller";
export * from "./moduleSetting.controller";
export * from "./moduleMaintenance.controller";

// ✅ Validation fonksiyonlarını tek seferde dışa aktar
export * from "./admin.validation";

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

// Ana exportlar
export { ModuleMeta, ModuleSetting };
export default router;
