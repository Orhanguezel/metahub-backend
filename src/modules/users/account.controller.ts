import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getUserOrFail, validateJsonField } from "@/core/utils/validation";
import { checkPassword, hashNewPassword } from "@/services/authService";
import { safelyDeleteFile } from "@/core/utils/fileUtils";
import { BASE_URL, UPLOAD_BASE_PATH } from "@/core/middleware/uploadMiddleware";
import fs from "fs/promises";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import {
  getFallbackThumbnail,
  processImageLocal,
  shouldProcessImage,
  getImagePath,
} from "@/core/utils/uploadUtils";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import userTranslations from "@/modules/users/i18n";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// Locale helper
function getLocale(req: Request): SupportedLocale {
  return (req.locale as SupportedLocale) || getLogLocale();
}
function userT(
  key: string,
  locale: SupportedLocale,
  vars?: Record<string, string | number>
) {
  return t(key, locale, userTranslations, vars);
}

async function processUploadedProfileImage(file: Express.Multer.File) {
  const imageUrl = getImagePath(file, "profile-images");
  let { thumbnail, webp } = getFallbackThumbnail(imageUrl);
  let publicId = (file as any).public_id;
  if (shouldProcessImage()) {
    const processed = await processImageLocal(
      file.path,
      file.filename,
      path.dirname(file.path)
    );
    thumbnail = processed.thumbnail;
    webp = processed.webp;
  }
  return { url: imageUrl, thumbnail, webp, publicId };
}

// ✅ Kendi profilini getir
export const getMyProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const locale = getLocale(req);
    const { User } = await getTenantModels(req);

    const user = await User.findOne({ _id: req.user!.id, tenant: req.tenant })
      .select("-password")
      .populate("addresses profile payment cart orders favorites");

    if (!user) {
      logger.warn(`[PROFILE] User not found: ${req.user!.id}`);
      res
        .status(404)
        .json({ success: false, message: userT("error.userNotFound", locale) });
      return;
    }
    logger.info(`[PROFILE] Profile fetched for: ${user.email}`);
    res.status(200).json({
      success: true,
      message: userT("profile.fetch.success", locale),
      user,
    });
  }
);

// ✅ Profil güncelle
export const updateMyProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const locale = getLocale(req);
    const { User } = await getTenantModels(req);
    const user = await User.findOne({ _id: req.user!.id, tenant: req.tenant });
    if (!user) return;

    const { name, email, phone, language } = req.body;
    user.name = name ?? user.name;
    user.email = email ?? user.email;
    user.phone = phone ?? user.phone;
    user.language = language ?? user.language ?? locale;

    const updated = await user.save();

    logger.info(`[PROFILE] Updated for: ${user.email}`);
    res.status(200).json({
      success: true,
      message: userT("profile.update.success", locale),
      user: {
        _id: updated._id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        language: updated.language,
      },
    });
  }
);

// ✅ Şifre güncelle
export const updateMyPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const locale = getLocale(req);
    const { User } = await getTenantModels(req);
    const user = await User.findOne({
      _id: req.user!.id,
      tenant: req.tenant,
    }).select("+password");
    if (!user) {
      logger.warn(
        `[PROFILE] User not found for password change: ${req.user!.id}`
      );
      res
        .status(404)
        .json({ success: false, message: userT("error.userNotFound", locale) });
      return;
    }
    const { currentPassword, newPassword } = req.body;

    const isMatch = await checkPassword(req, currentPassword, user.password);
    if (!isMatch) {
      logger.warn(`[PROFILE] Incorrect current password for: ${user.email}`);
      res.status(400).json({
        success: false,
        message: userT("error.currentPasswordIncorrect", locale),
      });
      return;
    }
    user.password = await hashNewPassword(req, newPassword);
    await user.save();
    logger.info(`[PROFILE] Password updated for: ${user.email}`);
    res.status(200).json({
      success: true,
      message: userT("password.update.success", locale),
    });
  }
);

// ✅ Bildirim ayarlarını güncelle
export const updateNotificationSettings = asyncHandler(
  async (req: Request, res: Response) => {
    const locale = getLocale(req);
    const { User } = await getTenantModels(req);
    const user = await User.findOne(
      { _id: req.user!.id, tenant: req.tenant },
      User
    );
    if (!user) return;

    const { emailNotifications, smsNotifications } = req.body;
    user.notifications = {
      emailNotifications:
        emailNotifications ?? user.notifications?.emailNotifications,
      smsNotifications:
        smsNotifications ?? user.notifications?.smsNotifications,
    };
    await user.save();
    logger.info(`[PROFILE] Notification settings updated for: ${user.email}`);
    res.status(200).json({
      success: true,
      message: userT("notification.update.success", locale),
      notifications: user.notifications,
    });
  }
);

// ✅ Sosyal medya bağlantıları güncelle
export const updateSocialMediaLinks = asyncHandler(
  async (req: Request, res: Response) => {
    const locale = getLocale(req);
    const { User } = await getTenantModels(req);
    const user = await User.findOne(
      { _id: req.user!.id, tenant: req.tenant },
      User
    );
    if (!user) return;
    const { facebook, instagram, twitter } = req.body;
    user.socialMedia = {
      facebook: facebook ?? user.socialMedia?.facebook,
      instagram: instagram ?? user.socialMedia?.instagram,
      twitter: twitter ?? user.socialMedia?.twitter,
    };
    await user.save();
    logger.info(`[PROFILE] Social links updated for: ${user.email}`);
    res.status(200).json({
      success: true,
      message: userT("socialMedia.update.success", locale),
      socialMedia: user.socialMedia,
    });
  }
);

// ✅ Profil fotoğrafı güncelle
export const updateProfileImage = asyncHandler(
  async (req: Request, res: Response) => {
    const locale = getLocale(req);
    const { User } = await getTenantModels(req);
    if (!req.file) {
      logger.warn(`[PROFILE] No file uploaded for profile image.`);
      res.status(400).json({
        success: false,
        message: userT("error.noFileUploaded", locale),
      });
      return;
    }
    const user = await User.findOne({ _id: req.user!.id, tenant: req.tenant });
    if (!user) {
      logger.warn(
        `[PROFILE] User not found for profile image: ${req.user!.id}`
      );
      res
        .status(404)
        .json({ success: false, message: userT("error.userNotFound", locale) });
      return;
    }
    // Eski görseli sil
    if (user.profileImage) {
      const img = user.profileImage as any;
      if (img.publicId) {
        try {
          await cloudinary.uploader.destroy(img.publicId);
        } catch {}
      }
      if (img.url && img.url.startsWith("/uploads/profile-images/")) {
        try {
          const localPath = path.join(
            process.cwd(),
            "uploads",
            "profile-images",
            path.basename(img.url)
          );
          await fs.unlink(localPath);
        } catch {}
      }
      if (typeof img === "string") {
        try {
          const localPath = path.join(
            process.cwd(),
            "uploads",
            "profile-images",
            img
          );
          await fs.unlink(localPath);
        } catch {}
      }
    }
    const profileImage = await processUploadedProfileImage(req.file);
    user.profileImage = profileImage;
    await user.save();

    logger.info(`[PROFILE] Profile image updated for: ${user.email}`);
    res.status(200).json({
      success: true,
      message: userT("profileImage.update.success", locale),
      profileImage: user.profileImage,
    });
  }
);

// ✅ Full profil güncelle
export const updateFullProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const locale = getLocale(req);
    const { User } = await getTenantModels(req);
    const updateFields: Record<string, any> = { ...req.body };
    const jsonFields = ["addresses", "notifications", "socialMedia", "payment"];
    for (const field of jsonFields) {
      try {
        if (updateFields[field] !== undefined) {
          updateFields[field] = validateJsonField(updateFields[field], field);
        }
      } catch {
        logger.warn(`[PROFILE] Invalid JSON for field: ${field}`);
        res.status(400).json({
          success: false,
          message: userT("error.invalidJsonField", locale, { field }),
        });
        return;
      }
    }
    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user!.id, tenant: req.tenant },
      { ...updateFields },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      logger.warn(`[PROFILE] User not found for full update: ${req.user!.id}`);
      res
        .status(404)
        .json({ success: false, message: userT("error.userNotFound", locale) });
      return;
    }

    logger.info(`[PROFILE] Full profile updated for: ${updatedUser.email}`);
    res.status(200).json({
      success: true,
      message: userT("profile.update.success", locale),
      user: updatedUser,
    });
  }
);

// ✅ Kendi hesabını sil
export const deleteMyAccount = asyncHandler(
  async (req: Request, res: Response) => {
    const locale = getLocale(req);
    const { User } = await getTenantModels(req);
    const { password } = req.body;
    const user = await User.findOne({
      _id: req.user!.id,
      tenant: req.tenant,
    }).select("+password");
    if (!user) {
      logger.warn(`[PROFILE] User not found for delete: ${req.user!.id}`);
      res
        .status(404)
        .json({ success: false, message: userT("error.userNotFound", locale) });
      return;
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.warn(`[PROFILE] Invalid password for delete: ${user.email}`);
      res.status(400).json({
        success: false,
        message: userT("error.invalidPassword", locale),
      });
      return;
    }
    // Profil fotoğrafını sil
    if (user.profileImage) {
      const img = user.profileImage as any;
      if (img && img.publicId) {
        try {
          await cloudinary.uploader.destroy(img.publicId);
        } catch {}
      }
      if (img && img.url && img.url.startsWith("/uploads/profile-images/")) {
        try {
          const localPath = path.join(
            process.cwd(),
            "uploads",
            "profile-images",
            path.basename(img.url)
          );
          await fs.unlink(localPath);
        } catch {}
      }
      if (typeof img === "string") {
        try {
          const localPath = path.join(
            process.cwd(),
            "uploads",
            "profile-images",
            img
          );
          await fs.unlink(localPath);
        } catch {}
      }
    }
    await User.findByIdAndDelete(req.user!.id, { tenant: req.tenant });
    logger.info(`[PROFILE] Account deleted: ${user.email}`);
    res.status(200).json({
      success: true,
      message: userT("account.delete.success", locale),
    });
  }
);
