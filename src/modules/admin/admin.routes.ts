import express from "express";
import {
  getModules,
  getModuleByName,
  updateModule,
  deleteModule,
  getProjects,
  createModule,
  getEnabledModules,
  getAnalyticsModules,
  toggleUseAnalytics,
} from "./admin.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateUpdateModule,
  validateModuleNameParam,
  validateCreateModule,
} from "./admin.validation";

const router = express.Router();

// 🔓 Public - Projeye özel enabled modüller
router.get("/enabled-modules", getEnabledModules);

// 🔓 Public - Projeye özel analytics modülleri
router.get("/analytics-modules", getAnalyticsModules);

// --- Bundan sonrası ADMIN/AUTH korumalı! ---
router.use(authenticate, authorizeRoles("admin"));

// ➕ Yeni modül oluştur
router.post("/modules", validateCreateModule, createModule);

// 📋 Tüm modülleri listele
router.get("/modules", getModules);

// 📋 Tüm projeleri listele
router.get("/projects", getProjects);

// 🔍 Belirli modülü getir
router.get("/module/:name", validateModuleNameParam, getModuleByName);

// ✏️ Belirli modülü güncelle
router.patch("/module/:name", validateModuleNameParam, validateUpdateModule, updateModule);

// 🗑️ Belirli modülü sil
router.delete("/module/:name", validateModuleNameParam, deleteModule);

// 🔁 Analytics toggle işlemi
router.patch("/modules/:name/toggle-analytics", toggleUseAnalytics);

export default router;
