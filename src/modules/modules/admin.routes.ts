import express from "express";
import {
  getModules,
  getModuleByName,
  updateModule,
  deleteModule,
  createModule,
  getEnabledModules,
  getAnalyticsModules,
  toggleUseAnalytics,
  getTenantModules,
  getDistinctTenantModules,
  updateTenantModuleSetting,
} from "./admin.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateUpdateModule,
  validateModuleNameParam,
  validateCreateModule,
  validateModuleFilters,
  validateTenantQuery,
  // validateTenantModuleSetting, // (isteğe bağlı eklenebilir)
} from "./admin.validation";

const router = express.Router();

// --- 🔓 Public (tenant context ile) ---
router.get("/enabled-modules", validateModuleFilters, getEnabledModules);
router.get("/analytics-modules", validateModuleFilters, getAnalyticsModules);
router.get("/tenant-modules", validateTenantQuery, getTenantModules);
router.get(
  "/tenant-distinct-modules",
  validateTenantQuery,
  getDistinctTenantModules
);

// --- ADMIN / AUTH KORUMALI ---
router.use(authenticate, authorizeRoles("admin"));

// ➕ Yeni modül oluştur
router.post("/modules", validateCreateModule, createModule);

// 📋 Tüm modülleri listele (aktif tenant context)
router.get("/modules", getModules);

// 🔍 Belirli modülü getir
router.get("/module/:name", validateModuleNameParam, getModuleByName);

// ✏️ Belirli modülü güncelle
router.patch(
  "/module/:name",
  validateModuleNameParam,
  validateUpdateModule,
  updateModule
);

// 🗑️ Belirli modülü sil (yalnızca tenant context için)
router.delete("/module/:name", validateModuleNameParam, deleteModule);

// --- TENANT MODULE SETTINGS PATCH (enabled/sidebar/analytics toggle) ---
router.patch(
  "/modules/tenant-setting",
  // validateTenantModuleSetting, // (isteğe bağlı)
  updateTenantModuleSetting
);

// 🔁 Analytics toggle işlemi (tenant + module body ile)
router.patch("/modules/toggle-analytics", toggleUseAnalytics);

export default router;
