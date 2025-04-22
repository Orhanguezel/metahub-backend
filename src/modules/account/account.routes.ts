import express from "express";
import {
  getMyProfile,
  updateMyProfile,
  updateMyPassword,
  updateNotificationSettings,
  updateSocialMediaLinks,
  updateProfileImage,
} from "../user/account.controller";
import { updateAllUserAddresses } from "../user/address.controller";

import { authenticate } from "../../core/middleware/authMiddleware";
import upload from "../../core/middleware/uploadMiddleware";

const router = express.Router();

// 🧾 Kullanıcı kendi hesabı
router.get("/me", authenticate, getMyProfile);
router.put("/me/update", authenticate, updateMyProfile);
router.put("/me/password", authenticate, updateMyPassword);
router.patch("/me/notifications", authenticate, updateNotificationSettings);
router.patch("/me/social", authenticate, updateSocialMediaLinks);
router.put("/me/addresses", authenticate, updateAllUserAddresses);


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
