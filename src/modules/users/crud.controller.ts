import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { User } from "@/modules/users";
import {
  isValidObjectId,
  getUserOrFail,
  validateJsonField,
} from "@/core/utils/validation";
import { safelyDeleteFile } from "@/core/utils/fileUtils";
import path from "path";
import { BASE_URL, UPLOAD_BASE_PATH } from "@/core/middleware/uploadMiddleware";

// 📂 Profil resim klasörü
const PROFILE_IMAGE_DIR = path.join(UPLOAD_BASE_PATH, "profile-images");

// ✅ Admin: Tüm kullanıcıları getir
export const getUsers = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const users = await User.find().select("-password");
  res.status(200).json({
    success: true,
    message: _req.locale === "de"
      ? "Alle Benutzer erfolgreich abgerufen"
      : _req.locale === "tr"
      ? "Tüm kullanıcılar başarıyla getirildi"
      : "All users fetched successfully",
    data: users,
  });
});

// ✅ Admin: Kullanıcıyı ID ile getir
export const getUserById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({
      success: false,
      message: req.locale === "de"
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
    message: req.locale === "de"
      ? "Benutzer erfolgreich abgerufen"
      : req.locale === "tr"
      ? "Kullanıcı başarıyla getirildi"
      : "User fetched successfully",
    data: user,
  });
});

// ✅ Admin: Kullanıcıyı güncelle
export const updateUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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

  const user = await getUserOrFail(id, res);
  if (!user) return;

  let profileImage = user.profileImage;
  if (req.file) {
    profileImage = req.file.filename;

    if (oldProfileImage) {
      const oldFilename = oldProfileImage.split("/").pop();
      if (oldFilename) {
        const oldPath = path.join(PROFILE_IMAGE_DIR, oldFilename);
        safelyDeleteFile(oldPath);
      }
    }
  }

  const updates: any = {
    name: name ?? user.name,
    email: email ?? user.email,
    role: role ?? user.role,
    isActive: typeof isActive === "boolean" ? isActive : user.isActive,
    phone: phone ?? user.phone,
    bio: bio ?? user.bio,
    birthDate: birthDate ? new Date(birthDate) : user.birthDate,
    profileImage,
  };

  // ✅ JSON alanları güvenle güncelle
  try {
    updates.socialMedia = socialMedia ? validateJsonField(socialMedia, "socialMedia") : user.socialMedia;
    updates.notifications = notifications ? validateJsonField(notifications, "notifications") : user.notifications;
    updates.addresses = addresses ? validateJsonField(addresses, "addresses") : user.addresses;
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
    return;
  }

  const updatedUser = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

  res.status(200).json({
    success: true,
    message: req.locale === "de"
      ? "Benutzer erfolgreich aktualisiert"
      : req.locale === "tr"
      ? "Kullanıcı başarıyla güncellendi"
      : "User updated successfully",
    data: updatedUser,
  });
});

// ✅ Admin: Kullanıcıyı sil
export const deleteUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({
      success: false,
      message: req.locale === "de"
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
      message: req.locale === "de"
        ? "Benutzer nicht gefunden"
        : req.locale === "tr"
        ? "Kullanıcı bulunamadı"
        : "User not found",
    });
    return;
  }

  if (user.profileImage) {
    const imagePath = path.join(PROFILE_IMAGE_DIR, user.profileImage);
    safelyDeleteFile(imagePath);
  }

  res.status(200).json({
    success: true,
    message: req.locale === "de"
      ? "Benutzer erfolgreich gelöscht"
      : req.locale === "tr"
      ? "Kullanıcı başarıyla silindi"
      : "User deleted successfully",
    data: { userId: id },
  });
});
