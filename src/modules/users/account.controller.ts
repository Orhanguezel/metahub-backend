import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { validateJsonField } from "@/core/utils/validation";
import { checkPassword, hashNewPassword } from "@/services/authService";
import fs from "fs/promises";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import {
  getFallbackThumbnail,
  processImageLocal,
  shouldProcessImage,
  getImagePath,
} from "@/core/middleware/file/uploadUtils";
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

// ✅ Kendi profilini getir (adresler doğrudan Address koleksiyonundan ekleniyor)
export const getMyProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const locale = getLocale(req);
    const { User, Address } = await getTenantModels(req);

    // Sadece user'ı çek (addresses: ObjectId[] şeklinde)
    const user = await User.findOne({ _id: req.user!.id, tenant: req.tenant })
      .select("-password")
      .populate("profile payment cart orders favorites");

    if (!user) {
      logger.withReq.warn(req, `[PROFILE] User not found: ${req.user!.id}`);
      res.status(404).json({
        success: false,
        message: userT("error.userNotFound", locale),
      });
      return;
    }

    // Tüm adresler ayrı collection'dan alınır (frontend'de Address[] ile uyumlu olacak!)
    const addresses = await Address.find({
      userId: user._id,
      tenant: req.tenant,
    }).lean();

    const userObj = user.toObject();
    userObj.addresses = userObj.addresses ?? []; // ObjectId[] (referans array'i)
    userObj.addressesPopulated = addresses; // Address[]

    logger.withReq.info(req, `[PROFILE] Profile fetched for: ${user.email}`);
    res.status(200).json({
      success: true,
      message: userT("profile.fetch.success", locale),
      user: userObj,
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

    const { name, email, phone, language, company, position } = req.body;
    user.name = name ?? user.name;
    user.email = email ?? user.email;
    user.phone = phone ?? user.phone;
    user.language = language ?? user.language ?? locale;
    user.company = company ?? user.company;
    user.position = position ?? user.position;

    const updated = await user.save();

    logger.withReq.info(req, `[PROFILE] Updated for: ${user.email}`);
    res.status(200).json({
      success: true,
      message: userT("profile.update.success", locale),
      user: {
        _id: updated._id,
        name: updated.name,
        company: updated.company,
        position: updated.position,
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
      logger.withReq.warn(
        req,
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
      logger.withReq.warn(
        req,
        `[PROFILE] Incorrect current password for: ${user.email}`
      );
      res.status(400).json({
        success: false,
        message: userT("error.currentPasswordIncorrect", locale),
      });
      return;
    }
    user.password = await hashNewPassword(req, newPassword);
    await user.save();
    logger.withReq.info(req, `[PROFILE] Password updated for: ${user.email}`);
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
    logger.withReq.info(
      req,
      `[PROFILE] Notification settings updated for: ${user.email}`
    );
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
      { _id: req.user!.id, tenant: req.tenant }
    );
    if (!user) return;
    const { facebook, instagram, twitter } = req.body;
    user.socialMedia = {
      facebook: facebook ?? user.socialMedia?.facebook,
      instagram: instagram ?? user.socialMedia?.instagram,
      twitter: twitter ?? user.socialMedia?.twitter,
    };
    await user.save();
    logger.withReq.info(
      req,
      `[PROFILE] Social links updated for: ${user.email}`
    );
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
      logger.withReq.warn(req, `[PROFILE] No file uploaded for profile image.`);
      res.status(400).json({
        success: false,
        message: userT("error.noFileUploaded", locale),
      });
      return;
    }
    const user = await User.findOne({ _id: req.user!.id, tenant: req.tenant });
    if (!user) {
      logger.withReq.warn(
        req,
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
            req.tenant,
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
            req.tenant,
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

    logger.withReq.info(
      req,
      `[PROFILE] Profile image updated for: ${user.email}`
    );
    res.status(200).json({
      success: true,
      message: userT("profileImage.update.success", locale),
      profileImage: user.profileImage,
    });
  }
);
// ✅ Full profil güncelle (SADE, TUTARLI, REFERANS ALANLAR KORUNUR)
export const updateFullProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const locale = getLocale(req);
    const { User } = await getTenantModels(req);

    const updateFields: Record<string, any> = { ...req.body };

    // ❗ Sadece şu alanlar JSON olarak kontrol edilebilir
    const jsonFields = ["notifications", "socialMedia"];

    for (const field of jsonFields) {
      try {
        if (updateFields[field] !== undefined) {
          updateFields[field] = validateJsonField(updateFields[field], field);
        }
      } catch {
        logger.withReq.warn(req, `[PROFILE] Invalid JSON for field: ${field}`);
        res.status(400).json({
          success: false,
          message: userT("error.invalidJsonField", locale, { field }),
        });
        return;
      }
    }

    // ❌ Güvenlik için şu alanlar asla güncellenemez
    const blockedFields = [
      "_id",
      "tenant",
      "role",
      "password",
      "orders",
      "cart",
      "profile",
      "favorites",
      "addresses", // ← adres güncellemesi adres endpointinden yapılır!
      "createdAt",
      "updatedAt",
    ];
    for (const key of blockedFields) {
      if (key in updateFields) {
        delete updateFields[key];
      }
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user!.id, tenant: req.tenant },
      updateFields,
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      logger.withReq.warn(
        req,
        `[PROFILE] User not found for full update: ${req.user!.id}`
      );
      res.status(404).json({
        success: false,
        message: userT("error.userNotFound", locale),
      });
      return;
    }

    logger.withReq.info(
      req,
      `[PROFILE] Full profile updated for: ${updatedUser.email}`
    );
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
      logger.withReq.warn(
        req,
        `[PROFILE] User not found for delete: ${req.user!.id}`
      );
      res
        .status(404)
        .json({ success: false, message: userT("error.userNotFound", locale) });
      return;
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.withReq.warn(
        req,
        `[PROFILE] Invalid password for delete: ${user.email}`
      );
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
    logger.withReq.info(req, `[PROFILE] Account deleted: ${user.email}`);
    res.status(200).json({
      success: true,
      message: userT("account.delete.success", locale),
    });
  }
);
