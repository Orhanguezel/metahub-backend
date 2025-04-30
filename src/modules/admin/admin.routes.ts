// src/modules/admin/admin.routes.ts
import express from "express";
import {
  getModules,
  getModuleByName,
  updateModule,
  deleteModule,
  getProjects,
  createModule,
  getModuleAnalytics,
} from "./admin.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validateUpdateModule, validateModuleNameParam,validateCreateModule} from "./admin.validation";

const router = express.Router();

// 🎯 Admin modülleri - Protected
router.use(authenticate, authorizeRoles("admin"));

router.post("/modules", authenticate, authorizeRoles("admin"), validateCreateModule, createModule);


// 📋 Tüm modülleri listele
router.get("/modules", getModules);

// 📋 Tüm projeleri listele
router.get("/projects", getProjects);

// 🔍 Belirli modülü getir
router.get("/module/:name", validateModuleNameParam, getModuleByName);

router.get("/modules/analytics", getModuleAnalytics);

// ✏️ Belirli modülü güncelle
router.patch("/module/:name", validateModuleNameParam, validateUpdateModule, updateModule);

// 🗑️ Belirli modülü sil
router.delete("/module/:name", validateModuleNameParam, deleteModule);



export default router;
