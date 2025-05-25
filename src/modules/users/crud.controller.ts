import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { User } from "@/modules/users";
import {
  isValidObjectId,
  getUserOrFail,
  validateJsonField,
} from "@/core/utils/validation";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

// 📂 Profil resim klasörü
const PROFILE_IMAGE_DIR = path.join(process.cwd(), "uploads", "profile-images");

// ✅ Admin: Tüm kullanıcıları getir
export const getUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.find().select("-password");
  res.status(200).json({
    success: true,
    message:
      _req.locale === "de"
        ? "Alle Benutzer erfolgreich abgerufen"
        : _req.locale === "tr"
        ? "Tüm kullanıcılar başarıyla getirildi"
        : "All users fetched successfully",
    data: users,
  });
});

// ✅ Admin: Kullanıcıyı ID ile getir
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({
      success: false,
      message:
        req.locale === "de"
          ? "Ungültige Benutzer-ID"
          : req.locale === "tr"
          ? "Geçersiz kullanıcı ID formatı"
          : "Invalid user ID format",
    });
    return;
  }

  const user = await getUserOrFail(id, res);
  if (!user) return;

  res.status(200).json({
    success: true,
    message:
      req.locale === "de"
        ? "Benutzer erfolgreich abgerufen"
        : req.locale === "tr"
        ? "Kullanıcı başarıyla getirildi"
        : "User fetched successfully",
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
    oldProfileImage, // eskiyi silmek için (url/publicId vs.)
  } = req.body;

  const user = await getUserOrFail(id, res);
  if (!user) return;

  let newProfileImage = user.profileImage;

  // Eğer yeni dosya yüklenmişse
  if (req.file) {
    // 1️⃣ Eski resmi sil (hem Cloudinary hem local)
    if (user.profileImage) {
      // Obje ise
      if (typeof user.profileImage === "object") {
        if (user.profileImage.publicId) {
          try { await cloudinary.uploader.destroy(user.profileImage.publicId); } catch {}
        }
        if (
          user.profileImage.url &&
          user.profileImage.url.startsWith("/uploads/profile-images/")
        ) {
          try {
            const localPath = path.join(PROFILE_IMAGE_DIR, path.basename(user.profileImage.url));
            await fs.promises.unlink(localPath);
          } catch {}
        }
      }
      // String ise
      else if (typeof user.profileImage === "string") {
        try {
          const localPath = path.join(PROFILE_IMAGE_DIR, user.profileImage);
          await fs.promises.unlink(localPath);
        } catch {}
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

  // ✅ JSON alanları güvenle güncelle
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
    updates.socialMedia = socialMedia ? validateJsonField(socialMedia, "socialMedia") : user.socialMedia;
    updates.notifications = notifications ? validateJsonField(notifications, "notifications") : user.notifications;
    updates.addresses = addresses ? validateJsonField(addresses, "addresses") : user.addresses;
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
    return;
  }

  const updatedUser = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

  res.status(200).json({
    success: true,
    message:
      req.locale === "de"
        ? "Benutzer erfolgreich aktualisiert"
        : req.locale === "tr"
        ? "Kullanıcı başarıyla güncellendi"
        : "User updated successfully",
    data: updatedUser,
  });
});

// ✅ Admin: Kullanıcıyı sil (profil fotoğrafı Cloudinary & local dosya mantığı ile)
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({
      success: false,
      message:
        req.locale === "de"
          ? "Ungültige Benutzer-ID"
          : req.locale === "tr"
          ? "Geçersiz kullanıcı ID formatı"
          : "Invalid user ID format",
    });
    return;
  }

  const user = await User.findByIdAndDelete(id);
  if (!user) {
    res.status(404).json({
      success: false,
      message:
        req.locale === "de"
          ? "Benutzer nicht gefunden"
          : req.locale === "tr"
          ? "Kullanıcı bulunamadı"
          : "User not found",
    });
    return;
  }

  // Profil resmi sil (objeyse hem cloud hem local, stringse local)
  if (user.profileImage) {
    if (typeof user.profileImage === "object") {
      if (user.profileImage.publicId) {
        try { await cloudinary.uploader.destroy(user.profileImage.publicId); } catch {}
      }
      if (
        user.profileImage.url &&
        user.profileImage.url.startsWith("/uploads/profile-images/")
      ) {
        try {
          const localPath = path.join(PROFILE_IMAGE_DIR, path.basename(user.profileImage.url));
          await fs.promises.unlink(localPath);
        } catch {}
      }
    } else if (typeof user.profileImage === "string") {
      try {
        const localPath = path.join(PROFILE_IMAGE_DIR, user.profileImage);
        await fs.promises.unlink(localPath);
      } catch {}
    }
  }

  res.status(200).json({
    success: true,
    message:
      req.locale === "de"
        ? "Benutzer erfolgreich gelöscht"
        : req.locale === "tr"
        ? "Kullanıcı başarıyla silindi"
        : "User deleted successfully",
    data: { userId: id },
  });
});
