import express from "express";
import * as adminModuleExtras from "./admin.module.extras.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";

const router = express.Router();
import {
  validateBatchAssign,
  validateBatchUpdate,
  validateTenantParam,
} from "./admin.validation";

// --- ADMIN / AUTH KORUMALI ---
router.use(authenticate, authorizeRoles("admin"));

// --- Modül-Tenant yönetimi ek endpointler ---
router.get("/modules/tenant-matrix", adminModuleExtras.getModuleTenantMatrix);
router.post(
  "/modules/batch-assign",
  validateBatchAssign,
  adminModuleExtras.assignAllModulesToTenant
);
router.post(
  "/modules/global-assign",
  adminModuleExtras.assignModuleToAllTenants
);
router.post("/modules/repair-settings", adminModuleExtras.repairModuleSettings);
router.delete(
  "/modules/tenant-cleanup",
  adminModuleExtras.removeAllModulesFromTenant
);
router.delete(
  "/modules/global-cleanup",
  adminModuleExtras.removeModuleFromAllTenants
);
router.delete(
  "/modules/cleanup-orphan",
  adminModuleExtras.cleanupOrphanModuleSettings
);
router.get(
  "/modules/analytics-status",
  adminModuleExtras.getAllAnalyticsStatus
);
router.patch(
  "/modules/batch-update",
  validateBatchUpdate,
  adminModuleExtras.batchUpdateModuleSetting
);
router.get(
  "/modules/tenant/:tenant",
  validateTenantParam,
  adminModuleExtras.getTenantModuleSettings
);
router.delete(
  "/modules/tenant-mappings",
  adminModuleExtras.removeTenantMappingsOnDelete
);

export default router;
