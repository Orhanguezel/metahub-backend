// src/modules/section/sectionmeta.routes.ts
import express from "express";
import {
  getSectionMetas,
  createSectionMeta,
  getAllSectionMetas,
  updateSectionMeta,
  deleteSectionMeta,
} from "./sectionmeta.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateCreateSectionMeta,
  validateUpdateSectionMeta,
  validateSectionSettingKeyParam
} from "./section.validation"; // Validation middleware'ları import et

const router = express.Router();

router.get("/", getSectionMetas);

// Admin: Yeni meta ekle
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateCreateSectionMeta,    // 💡 Create validasyonu
  createSectionMeta
);

// Admin: Tüm metas
router.get(
  "/admin",
  authenticate,
  authorizeRoles("admin"),
  getAllSectionMetas
);

// Admin: Güncelle
router.put(
  "/:key",
  authenticate,
  authorizeRoles("admin"),
  validateSectionSettingKeyParam,      // 💡 Key param validasyonu
  validateUpdateSectionMeta,    // 💡 Update validasyonu
  updateSectionMeta
);

// Admin: Sil
router.delete(
  "/:key",
  authenticate,
  authorizeRoles("admin"),
  validateSectionSettingKeyParam,      // 💡 Key param validasyonu
  deleteSectionMeta
);

export default router;
