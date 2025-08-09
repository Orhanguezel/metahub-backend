// src/modules/modules/moduleMaintenance.router.ts (FINAL — tenant-scoped only)

import express from "express";
import {
  getModuleTenantMatrix,
  assignAllModulesToTenant,
  repairModuleSettings,
  removeAllModulesFromTenant,
  cleanupOrphanModuleSettings,
  getAllAnalyticsStatus,
  batchUpdateModuleSetting,
} from "./moduleMaintenance.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validateBatchAssign, validateBatchUpdate } from "./admin.validation";

const router = express.Router();

// AUTH: admin veya superadmin (hepsi tenant-scoped; global uç yok)
router.use(authenticate, authorizeRoles("admin", "superadmin"));

/**
 * NOT:
 * - Tenant path/body ile asla taşınmaz; x-tenant header’dan çözülür.
 * - Tüm uçlar yalnızca header’daki tenant üzerinde çalışır.
 */

// GET: Header’daki tenant için module→exists matrisi
router.get("/matrix", getModuleTenantMatrix);

// POST: Header’daki tenant’a tüm aktif modülleri assign et (eksikleri tamamla)
router.post("/batch-assign", validateBatchAssign, assignAllModulesToTenant);

// POST: Header’daki tenant için eksik setting mappinglerini tamamla
router.post("/repair-settings", repairModuleSettings);

// DELETE: Header’daki tenant’taki TÜM mappingleri sil (cleanup)
router.delete("/tenant-cleanup", removeAllModulesFromTenant);

// DELETE: Header’daki tenant’ta orphan mapping temizliği (meta’sı olmayanlar)
router.delete("/cleanup-orphan", cleanupOrphanModuleSettings);

// GET: Header’daki tenant için analitik info (meta.useAnalytics)
router.get("/analytics-status", getAllAnalyticsStatus);

// PATCH: Header’daki tenant için batch update (tek module’un mapping’i)
router.patch("/batch-update", validateBatchUpdate, batchUpdateModuleSetting);

export default router;
