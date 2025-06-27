import express from "express";
import {
  getModuleTenantMatrix,
  assignAllModulesToTenant,
  assignModuleToAllTenants,
  repairModuleSettings,
  removeAllModulesFromTenant,
  removeModuleFromAllTenants,
  cleanupOrphanModuleSettings,
  getAllAnalyticsStatus,
  batchUpdateModuleSetting,
} from "./moduleMaintenance.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateBatchAssign,
  validateBatchUpdate,
  validateTenantParam,
} from "./admin.validation";

const router = express.Router();

// ADMIN / AUTH KORUMALI
router.use(authenticate, authorizeRoles("admin"));

// GET: Tenant-modül matrix
router.get("/matrix", getModuleTenantMatrix);

// POST: Tek tenant’a tüm aktif modülleri assign et
router.post("/batch-assign", validateBatchAssign, assignAllModulesToTenant);

// POST: Tüm tenantlara bir modül ekle
router.post("/global-assign", assignModuleToAllTenants);

// POST: Eksik setting mappinglerini tamamla
router.post("/repair-settings", repairModuleSettings);

// DELETE: Bir tenant’taki tüm mappingleri sil
router.delete("/tenant-cleanup", removeAllModulesFromTenant);

// DELETE: Bir modülü tüm tenantlardan sil
router.delete("/global-cleanup", removeModuleFromAllTenants);

// DELETE: Orphan mapping temizliği (meta kaydı olmayanlar)
router.delete("/cleanup-orphan", cleanupOrphanModuleSettings);

// GET: Analitik info (useAnalytics field’ı)
router.get("/analytics-status", getAllAnalyticsStatus);

// PATCH: Batch update (bir modülün tüm mappingleri)
router.patch("/batch-update", validateBatchUpdate, batchUpdateModuleSetting);

export default router;
