// src/modules/modules/moduleSetting.router.ts (FINAL)

import express from "express";
import {
  updateModuleSetting,
  getTenantModuleSettings,
  deleteModuleSetting,
  deleteAllSettingsForTenant,
} from "./moduleSetting.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validateTenantModuleSetting } from "./admin.validation";

const router = express.Router();

// ADMIN / AUTH PROTECTED
router.use(authenticate, authorizeRoles("admin"));
// GET: Header'daki tenant için tüm module settings
router.get("/", getTenantModuleSettings);

// PATCH: Header'daki tenant için tek module setting override (enabled/sidebar/analytics/dashboard/roles/order/seo*)
router.patch("/", validateTenantModuleSetting, updateModuleSetting);

// DELETE: Header'daki tenant için tek mapping sil (body: { module })
router.delete("/", deleteModuleSetting);

// DELETE: Header'daki tenant için TÜM mappingleri sil (tenant cleanup)
router.delete("/tenant", deleteAllSettingsForTenant);

export default router;
