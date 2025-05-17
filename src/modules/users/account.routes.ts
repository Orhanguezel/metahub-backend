import express from "express";
import {
  getMyProfile,
  updateMyProfile,
  updateMyPassword,
  updateNotificationSettings,
  updateSocialMediaLinks,
  updateProfileImage,
  deleteMyAccount,
} from "./account.controller";

import {
  validateUpdateMyProfile,
  validateUpdateMyPassword,
  validateUpdateNotificationSettings,
  validateUpdateSocialLinks,
} from "./users.validation";

import { authenticate } from "@/core/middleware/authMiddleware";
import upload from "@/core/middleware/uploadMiddleware";

const router = express.Router();

// 🧾 Kullanıcı kendi hesabı
router.get("/me", authenticate, getMyProfile);
router.put(
  "/me/update",
  authenticate,
  validateUpdateMyProfile,
  updateMyProfile
);
router.put(
  "/me/password",
  authenticate,
  validateUpdateMyPassword,
  updateMyPassword
);
router.patch(
  "/me/notifications",
  authenticate,
  validateUpdateNotificationSettings,
  updateNotificationSettings
);
router.patch(
  "/me/social",
  authenticate,
  validateUpdateSocialLinks,
  updateSocialMediaLinks
);
router.delete("/me/delete", authenticate, deleteMyAccount);

// 📷 Profil fotoğrafı güncelleme
router.put(
  "/me/profile-image",
  authenticate,
  (req, res, next) => {
    req.uploadType = "profile";
    next();
  },
  upload.single("profileImage"),
  updateProfileImage
);

export default router;
