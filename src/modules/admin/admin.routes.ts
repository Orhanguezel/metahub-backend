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
} from "./admin.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateUpdateModule,
  validateModuleNameParam,
  validateCreateModule,
  validateModuleFilters,
  validateTenantQuery,
} from "./admin.validation";

const router = express.Router();

// --- 🔓 Public (tenant context ile) ---
// Tenant’ın aktif modüllerini getir
router.get("/enabled-modules", validateModuleFilters, getEnabledModules);

// Tenant’ın analytics modüllerini getir
router.get("/analytics-modules", validateModuleFilters, getAnalyticsModules);

// Tenant’ın modül ayarlarını getir (tüm modüller ve ayarları)
router.get("/tenant-modules", validateTenantQuery, getTenantModules);

// Tenant’ın benzersiz modül isimlerini getir
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

// 🔁 Analytics toggle işlemi (tenant + module body ile)
router.patch("/modules/toggle-analytics", toggleUseAnalytics);

export default router;
