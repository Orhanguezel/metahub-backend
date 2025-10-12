// src/modules/modules/moduleSetting.router.ts
import express from "express";
import {
  updateModuleSetting,
  getTenantModuleSettings,
  deleteModuleSetting,
  deleteAllSettingsForTenant,
} from "./moduleSetting.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import { validateTenantModuleSetting } from "./admin.validation";

const router = express.Router();

// ADMIN / AUTH PROTECTED
router.use(authenticate, authorizeRoles("admin"));

// GET: tenant için tüm settings
router.get("/", getTenantModuleSettings);

// PATCH: tenant için module setting override
router.patch("/", validateTenantModuleSetting, updateModuleSetting);

// DELETE: tenant için tek mapping sil
router.delete("/", deleteModuleSetting);

// DELETE: tenant için tüm mapping’leri sil
router.delete("/tenant", deleteAllSettingsForTenant);

export default router;
