import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import {
  isValidObjectId,
  getUserOrFail,
  validateJsonField,
} from "@/core/utils/validation";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import userTranslations from "@/modules/users/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// Kısayol fonksiyonu
function userT(
  key: string,
  locale: SupportedLocale,
  vars?: Record<string, string | number>
) {
  return t(key, locale, userTranslations, vars);
}

// 📂 Profil resim klasörü
const PROFILE_IMAGE_DIR = path.join(process.cwd(), "uploads", "profile-images");

// ✅ Admin: Tüm kullanıcıları getir
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { User } = await getTenantModels(req);

  logger.withReq.debug(req, `[Admin] getUsers called | locale=${locale}`);

  const users = await User.find({ tenant: req.tenant }).select("-password");

  logger.withReq.info(req, `[Admin] getUsers success | count=${users.length}`);

  res.status(200).json({
    success: true,
    message: userT("admin.users.fetched", locale),
    data: users,
  });
});

// ✅ Admin: Kullanıcıyı ID ile getir
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { User } = await getTenantModels(req);

  logger.withReq.debug(
    req,
    `[Admin] getUserById called | id=${id} | locale=${locale}`
  );

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, `[Admin] Invalid user ID: ${id}`);
    res.status(400).json({
      success: false,
      message: userT("admin.users.invalidId", locale),
    });
    return;
  }

  const user = await User.findOne({ _id: id, tenant: req.tenant });
  if (!user) {
    logger.withReq.warn(req, `[Admin] User not found: ${id}`);
    return;
  }

  logger.withReq.info(req, `[Admin] User fetched: ${id}`);

  res.status(200).json({
    success: true,
    message: userT("admin.users.fetchedOne", locale),
    data: user,
  });
});

// ✅ Admin: Kullanıcıyı güncelle (profil resmi - about mantığı)
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name,
    email,
    role,
    isActive,
    phone,
    bio,
    birthDate,
    socialMedia,
    notifications,
    addresses,
    oldProfileImage,
  } = req.body;

  const locale: SupportedLocale = req.locale || getLogLocale();
  const { User } = await getTenantModels(req);

  logger.withReq.debug(
    req,
    `[Admin] updateUser called | id=${id} | locale=${locale}`
  );

  const user = await User.findOne({ _id: id, tenant: req.tenant });
  if (!user) {
    logger.withReq.warn(req, `[Admin] User not found for update: ${id}`);
    return;
  }

  let newProfileImage = user.profileImage;

  // Eğer yeni dosya yüklenmişse
  if (req.file) {
    logger.withReq.info(req, `[Admin] Updating profile image for user: ${id}`);

    // 1️⃣ Eski resmi sil (Cloudinary ve local)
    if (user.profileImage) {
      if (typeof user.profileImage === "object") {
        if (user.profileImage.publicId) {
          try {
            await cloudinary.uploader.destroy(user.profileImage.publicId);
            logger.withReq.info(
              req,
              `[Admin] Cloudinary image deleted: ${user.profileImage.publicId}`
            );
          } catch (err) {
            logger.withReq.error(
              req,
              `[Admin] Cloudinary image delete error: ${err}`
            );
          }
        }
        if (
          user.profileImage.url &&
          user.profileImage.url.startsWith("/uploads/profile-images/")
        ) {
          try {
            const localPath = path.join(
              PROFILE_IMAGE_DIR,
              path.basename(user.profileImage.url)
            );
            await fs.promises.unlink(localPath);
            logger.withReq.info(
              req,
              `[Admin] Local profile image deleted: ${localPath}`
            );
          } catch (err) {
            logger.withReq.error(
              req,
              `[Admin] Local image delete error: ${err}`
            );
          }
        }
      } else if (typeof user.profileImage === "string") {
        try {
          const localPath = path.join(PROFILE_IMAGE_DIR, user.profileImage);
          await fs.promises.unlink(localPath);
          logger.withReq.info(
            req,
            `[Admin] Local profile image deleted: ${localPath}`
          );
        } catch (err) {
          logger.withReq.error(req, `[Admin] Local image delete error: ${err}`);
        }
      }
    }

    // 2️⃣ Yeni dosya objesini oluştur
    let url = "";
    let thumbnail = "";
    let webp = "";
    let publicId: string | undefined = undefined;

    if ((req.file as any).cloudinary === true || (req.file as any).public_id) {
      url = (req.file as any).path || (req.file as any).url;
      publicId = (req.file as any).public_id;
      thumbnail = (req.file as any).thumbnail || url;
      webp = (req.file as any).webp || "";
    } else {
      url = `/uploads/profile-images/${req.file.filename}`;
      thumbnail = url;
      webp = "";
    }
    newProfileImage = { url, thumbnail, webp, publicId };
  }

  // JSON alanları güvenle güncelle
  let updates: any = {
    name: name ?? user.name,
    email: email ?? user.email,
    role: role ?? user.role,
    isActive: typeof isActive === "boolean" ? isActive : user.isActive,
    phone: phone ?? user.phone,
    bio: bio ?? user.bio,
    birthDate: birthDate ? new Date(birthDate) : user.birthDate,
    profileImage: newProfileImage,
  };

  try {
    updates.socialMedia = socialMedia
      ? validateJsonField(socialMedia, "socialMedia")
      : user.socialMedia;
    updates.notifications = notifications
      ? validateJsonField(notifications, "notifications")
      : user.notifications;
    updates.addresses = addresses
      ? validateJsonField(addresses, "addresses")
      : user.addresses;
  } catch (error: any) {
    logger.withReq.warn(
      req,
      `[Admin] JSON field validation error: ${error.message}`
    );
    res.status(400).json({ success: false, message: error.message });
    return;
  }

  const updatedUser = await User.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
    tenant: req.tenant,
  });

  logger.withReq.info(req, `[Admin] User updated: ${id}`);

  res.status(200).json({
    success: true,
    message: userT("admin.users.updated", locale),
    data: updatedUser,
  });
});

// ✅ Admin: Kullanıcıyı sil (profil fotoğrafı Cloudinary & local dosya mantığı ile)
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { User } = await getTenantModels(req);

  logger.withReq.debug(
    req,
    `[Admin] deleteUser called | id=${id} | locale=${locale}`
  );

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, `[Admin] Invalid user ID: ${id}`);
    res.status(400).json({
      success: false,
      message: userT("admin.users.invalidId", locale),
    });
    return;
  }
  const user = await User.findOne({ _id: id, tenant: req.tenant });
  await User.deleteOne({ _id: id, tenant: req.tenant });
  if (!user) {
    logger.withReq.warn(req, `[Admin] User not found for delete: ${id}`);
    res.status(404).json({
      success: false,
      message: userT("admin.users.notFound", locale),
    });
    return;
  }

  // Profil resmi sil
  if (user.profileImage) {
    if (typeof user.profileImage === "object") {
      if (user.profileImage.publicId) {
        try {
          await cloudinary.uploader.destroy(user.profileImage.publicId);
          logger.withReq.info(
            req,
            `[Admin] Cloudinary image deleted: ${user.profileImage.publicId}`
          );
        } catch (err) {
          logger.withReq.error(
            req,
            `[Admin] Cloudinary image delete error: ${err}`
          );
        }
      }
      if (
        user.profileImage.url &&
        user.profileImage.url.startsWith("/uploads/profile-images/")
      ) {
        try {
          const localPath = path.join(
            PROFILE_IMAGE_DIR,
            path.basename(user.profileImage.url)
          );
          await fs.promises.unlink(localPath);
          logger.withReq.info(
            req,
            `[Admin] Local profile image deleted: ${localPath}`
          );
        } catch (err) {
          logger.withReq.error(req, `[Admin] Local image delete error: ${err}`);
        }
      }
    } else if (typeof user.profileImage === "string") {
      try {
        const localPath = path.join(PROFILE_IMAGE_DIR, user.profileImage);
        await fs.promises.unlink(localPath);
        logger.withReq.info(
          req,
          `[Admin] Local profile image deleted: ${localPath}`
        );
      } catch (err) {
        logger.withReq.error(req, `[Admin] Local image delete error: ${err}`);
      }
    }
  }

  logger.withReq.info(req, `[Admin] User deleted: ${id}`);

  res.status(200).json({
    success: true,
    message: userT("admin.users.deleted", locale),
    data: { userId: id },
  });
});
