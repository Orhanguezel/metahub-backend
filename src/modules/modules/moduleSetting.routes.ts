import express from "express";
import {
  updateModuleSetting,
  getTenantModuleSettings,
  deleteModuleSetting,
  deleteAllSettingsForTenant,
} from "./moduleSetting.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateBatchUpdate,
  validateTenantParam,
  validateTenantModuleSetting,
} from "./admin.validation";

const router = express.Router();

// ADMIN / AUTH KORUMALI
router.use(authenticate, authorizeRoles("admin"));

// PATCH: Tenant setting override (enabled/sidebar/analytics/dashboard/roles/order)
router.patch("/", validateTenantModuleSetting, updateModuleSetting);

// GET: Tenant'a ait tüm modül ayarları
router.get("/:tenant", validateTenantParam, getTenantModuleSettings);

// DELETE: Tenant + module ile mapping sil
router.delete("/", deleteModuleSetting);

// DELETE: Tüm mappingleri sil (tenant cleanup)
router.delete(
  "/tenant/:tenant",
  validateTenantParam,
  deleteAllSettingsForTenant
);

export default router;
