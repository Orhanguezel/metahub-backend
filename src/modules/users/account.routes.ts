import express from "express";
import {
  getMyProfile,
  updateMyProfile,
  updateMyPassword,
  updateNotificationSettings,
  updateSocialMediaLinks,
  updateProfileImage,
  updateFullProfile,
  deleteMyAccount,
  removeProfileImage
} from "./account.controller";

import {
  validateUpdateMyProfile,
  validateUpdateMyPassword,
  validateUpdateNotificationSettings,
  validateUpdateSocialLinks,
} from "./users.validation";

import { authenticate } from "@/core/middleware/authMiddleware";
import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";

const router = express.Router();

// 🧾 Profil Bilgisi
router.get("/me", authenticate, getMyProfile);

// 🔄 Profil Bilgilerini Güncelle
router.put(
  "/me/update",
  authenticate,
  validateUpdateMyProfile,
  updateMyProfile
);

// 🔑 Şifre Güncelle
router.put(
  "/me/password",
  authenticate,
  validateUpdateMyPassword,
  updateMyPassword
);

// 🔔 Bildirim Ayarlarını Güncelle
router.patch(
  "/me/notifications",
  authenticate,
  validateUpdateNotificationSettings,
  updateNotificationSettings
);

// 🌐 Sosyal Medya Linklerini Güncelle
router.patch(
  "/me/social",
  authenticate,
  validateUpdateSocialLinks,
  updateSocialMediaLinks
);

// 🗑️ Hesabı Sil
router.delete("/me/delete", authenticate, deleteMyAccount);

router.delete("/me/profile-image", authenticate, removeProfileImage);

router.put(
  "/me/profile-image",
  authenticate,
  uploadTypeWrapper("profile"),
  upload("profile").single("images"),
  updateProfileImage
);

// 📝 Profil Bilgilerini Tam Güncelle
router.put(
  "/me/full-profile",
  authenticate,
  uploadTypeWrapper("profile"),
  upload("profile").single("images"),
  updateFullProfile
);

export default router;
