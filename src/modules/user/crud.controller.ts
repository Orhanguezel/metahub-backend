import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import User from "../../modules/user/user.models";
import {
  isValidObjectId,
  getUserOrFail,
  validateJsonField,
} from "../../core/utils/validation";
import { safelyDeleteFile } from "../../core/utils/fileUtils";

const PROFILE_IMAGE_DIR = "uploads/profile-images";

// ✅ Admin: Tüm kullanıcıları getir
export const getUsers = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  }
);

// ✅ Admin: Kullanıcıyı ID ile getir
export const getUserById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({
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

    res.status(200).json(user);
  }
);

// ✅ Admin: Kullanıcıyı güncelle
export const updateUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
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

    // 🖼️ Profil görseli güncelle
    let profileImage = user.profileImage;
    if (req.file) {
      profileImage = `${process.env.BASE_URL}/uploads/profile-images/${req.file.filename}`;

      if (oldProfileImage?.includes("uploads/profile-images")) {
        const oldPath = `${PROFILE_IMAGE_DIR}/${oldProfileImage
          .split("/")
          .pop()}`;
        safelyDeleteFile(oldPath);
      }
    }

    // ✏️ Güncelleme işlemi
    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        name,
        email,
        role,
        isActive: isActive === "true" || isActive === true,
        phone,
        bio,
        birthDate: birthDate ? new Date(birthDate) : null,
        socialMedia: validateJsonField(socialMedia, "socialMedia"),
        notifications: validateJsonField(notifications, "notifications"),
        addresses: validateJsonField(addresses, "addresses"),
        profileImage,
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message:
        req.locale === "de"
          ? "Benutzer erfolgreich aktualisiert"
          : req.locale === "tr"
          ? "Kullanıcı başarıyla güncellendi"
          : "User updated successfully",
      user: updatedUser,
    });
  }
);

// ✅ Admin: Kullanıcıyı sil
export const deleteUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({
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
        message:
          req.locale === "de"
            ? "Benutzer nicht gefunden"
            : req.locale === "tr"
            ? "Kullanıcı bulunamadı"
            : "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message:
        req.locale === "de"
          ? "Benutzer erfolgreich gelöscht"
          : req.locale === "tr"
          ? "Kullanıcı başarıyla silindi"
          : "User deleted successfully",
      userId: id,
    });
  }
);
