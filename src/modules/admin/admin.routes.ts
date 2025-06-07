import express from "express";
import {
  getModules,
  getModuleByName,
  updateModule,
  deleteModule,
  getProjects,
  createModule,
  getEnabledModules
} from "./admin.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateUpdateModule,
  validateModuleNameParam,
  validateCreateModule
} from "./admin.validation";

const router = express.Router();

// 🎯 Tüm admin işlemleri korunur
router.use(authenticate, authorizeRoles("admin"));

router.get("/enabled-modules", getEnabledModules);

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

export default router;
