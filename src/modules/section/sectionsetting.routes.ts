import express from "express";
import {
  getAllSectionSettingsAdmin,
  createSectionSetting,
  getSectionSettingsByTenant,
  updateSectionSetting,
  deleteSectionSetting,
} from "./sectionsetting.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateCreateSectionSetting,
  validateUpdateSectionSetting,
  validateSectionSettingKeyParam
} from "./section.validation";

const router = express.Router();
// --- 0️⃣ Tenant için tüm section ayarlarını getir ---
router.get(
  "/",
  getSectionSettingsByTenant
);



// --- 1️⃣ Tenant için yeni section ayarı ekle ---
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateCreateSectionSetting,
  createSectionSetting
);

// --- 2️⃣ Tenant'ın tüm section ayarlarını getir (CURRENT tenant) ---
router.get(
  "/admin",
  authenticate,
  authorizeRoles("admin"),
  getAllSectionSettingsAdmin
);

// --- 3️⃣ Tenant-sectionKey ile güncelle ---
router.put(
  "/:sectionKey",
  authenticate,
  authorizeRoles("admin"),
  validateSectionSettingKeyParam,
  validateUpdateSectionSetting,
  updateSectionSetting
);

// --- 4️⃣ Tenant-sectionKey ile sil ---
router.delete(
  "/:sectionKey",
  authenticate,
  authorizeRoles("admin"),
  validateSectionSettingKeyParam,
  deleteSectionSetting
);

export default router;
