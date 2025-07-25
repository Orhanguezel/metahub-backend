import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  upsertSetting,
  getAllSettingsAdmin,
  getSettingByKeyAdmin,
  deleteSetting,
  upsertSettingImage,
  updateSettingImage,
} from "./admin.settings.controller";
import {
  validateUpsertSetting,
  validateSettingKeyParam,
} from "./settings.validation";
import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";

const router = express.Router();

// --- ADMIN ROUTES (only for admin panel, protected) ---
router.use("/", authenticate, authorizeRoles("admin"));

// Tüm admin settings (full, değiştirilebilir)
router.get("/", getAllSettingsAdmin);

// Tek admin setting (gerekiyorsa)
router.get("/:key", validateSettingKeyParam, getSettingByKeyAdmin);

// CRUD endpoints (sadece admin)
router.post("/", validateUpsertSetting, upsertSetting);
router.delete("/:key", validateSettingKeyParam, deleteSetting);

// Logo Upload (POST)
router.post(
  "/upload/:key",
  uploadTypeWrapper("settings"),
  upload("settings").array("images", 5),
  validateSettingKeyParam,
  upsertSettingImage
);

// Logo Upload (PUT)
router.put(
  "/upload/:key",
  uploadTypeWrapper("settings"),
  upload("settings").array("images", 5),
  validateSettingKeyParam,
  updateSettingImage
);

export default router;
