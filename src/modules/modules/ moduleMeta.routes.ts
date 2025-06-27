import express from "express";
import {
  createModuleMeta,
  updateModuleMeta,
  getAllModuleMetas,
  getModuleMetaByName,
  deleteModuleMeta,
  importModuleMetas,
} from "./moduleMeta.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateCreateModuleMeta,
  validateUpdateModuleMeta,
  validateModuleNameParam,
} from "./admin.validation";

const router = express.Router();

// ADMIN / AUTH KORUMALI
router.use(authenticate, authorizeRoles("admin"));

// ➕ Global meta oluştur
router.post("/", validateCreateModuleMeta, createModuleMeta);

router.post("/bulk-import", importModuleMetas);

// 📋 Tüm global meta kayıtlarını getir
router.get("/", getAllModuleMetas);

// 🔍 Belirli meta kaydını getir
router.get("/:name", validateModuleNameParam, getModuleMetaByName);

// ✏️ Belirli meta kaydını güncelle
router.patch(
  "/:name",
  validateModuleNameParam,
  validateUpdateModuleMeta,
  updateModuleMeta
);

// 🗑️ Belirli meta kaydını sil
router.delete("/:name", validateModuleNameParam, deleteModuleMeta);

export default router;
