import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import User from "./users.models";
import { getUserOrFail, validateJsonField } from "../../core/utils/validation";
import { checkPassword, hashNewPassword } from "../../services/authService";
import { safelyDeleteFile } from "../../core/utils/fileUtils";
import { BASE_URL,UPLOAD_BASE_PATH } from "../../core/middleware/uploadMiddleware";
import fs from "fs";
import path from "path";


export const getMyProfile = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = await User.findById(req.user!.id)
      .select("-password")
      .populate("addresses profile payment cart orders favorites");

    if (!user) {
      res.status(404).json({
        success: false,
        message:
          req.locale === "de"
            ? "Benutzer nicht gefunden."
            : req.locale === "tr"
            ? "Kullanıcı bulunamadı."
            : "User not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message:
        req.locale === "de"
          ? "Benutzerprofil erfolgreich abgerufen."
          : req.locale === "tr"
          ? "Kullanıcı profili başarıyla getirildi."
          : "User profile retrieved successfully.",
      user,
    });
  }
);

export const updateMyProfile = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = await getUserOrFail(req.user!.id, res);
    if (!user) return;

    const { name, email, phone, language } = req.body;

    try {
      user.name = name ?? user.name;
      user.email = email ?? user.email;
      user.phone = phone ?? user.phone;
      user.language = language ?? user.language ?? req.locale ?? "en";

      const updated = await user.save();

      res.status(200).json({
        success: true,
        message:
          req.locale === "de"
            ? "Profil erfolgreich aktualisiert."
            : req.locale === "tr"
            ? "Profil başarıyla güncellendi."
            : "Profile updated successfully.",
        user: {
          _id: updated._id,
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
          language: updated.language,
        },
      });
    } catch (error) {
      console.error("❌ Profile update error:", error);

      res.status(500).json({
        success: false,
        message:
          req.locale === "de"
            ? "Profilaktualisierung fehlgeschlagen."
            : req.locale === "tr"
            ? "Profil güncelleme işlemi başarısız oldu."
            : "Failed to update profile.",
      });
    }
  }
);


export const updateMyPassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = await User.findById(req.user!.id).select("+password");

    if (!user) {
      res.status(404).json({
        success: false,
        message:
          req.locale === "de"
            ? "Benutzer nicht gefunden."
            : req.locale === "tr"
            ? "Kullanıcı bulunamadı."
            : "User not found.",
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    const isMatch = await checkPassword(currentPassword, user.password);
    if (!isMatch) {
      res.status(400).json({
        success: false,
        message:
          req.locale === "de"
            ? "Das aktuelle Passwort ist falsch."
            : req.locale === "tr"
            ? "Mevcut şifre hatalı."
            : "Current password is incorrect.",
      });
      return;
    }

    user.password = await hashNewPassword(newPassword);
    await user.save();

    res.status(200).json({
      success: true,
      message:
        req.locale === "de"
          ? "Passwort erfolgreich aktualisiert."
          : req.locale === "tr"
          ? "Şifre başarıyla güncellendi."
          : "Password updated successfully.",
    });
  }
);

export const updateNotificationSettings = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = await getUserOrFail(req.user!.id, res);
    if (!user) return;

    const { emailNotifications, smsNotifications } = req.body;

    user.notifications = {
      emailNotifications:
        emailNotifications ?? user.notifications?.emailNotifications,
      smsNotifications:
        smsNotifications ?? user.notifications?.smsNotifications,
    };

    await user.save();

    res.status(200).json({
      success: true,
      message:
        req.locale === "de"
          ? "Benachrichtigungseinstellungen aktualisiert."
          : req.locale === "tr"
          ? "Bildirim tercihleri güncellendi."
          : "Notification preferences updated.",
      notifications: user.notifications,
    });
  }
);


export const updateSocialMediaLinks = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = await getUserOrFail(req.user!.id, res);
    if (!user) return;

    const { facebook, instagram, twitter } = req.body;

    user.socialMedia = {
      facebook: facebook ?? user.socialMedia?.facebook,
      instagram: instagram ?? user.socialMedia?.instagram,
      twitter: twitter ?? user.socialMedia?.twitter,
    };

    await user.save();

    res.status(200).json({
      success: true,
      message:
        req.locale === "de"
          ? "Social-Media-Links wurden aktualisiert."
          : req.locale === "tr"
          ? "Sosyal medya bağlantıları güncellendi."
          : "Social media links updated.",
      socialMedia: user.socialMedia,
    });
  }
);


export const updateProfileImage = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message:
          req.locale === "de"
            ? "Keine Datei hochgeladen."
            : req.locale === "tr"
            ? "Dosya yüklenmedi."
            : "No file uploaded.",
      });
      return;
    }

    const user = await User.findById(req.user!.id);
    if (!user) {
      res.status(404).json({
        success: false,
        message:
          req.locale === "de"
            ? "Benutzer nicht gefunden."
            : req.locale === "tr"
            ? "Kullanıcı bulunamadı."
            : "User not found.",
      });
      return;
    }

    const profileDir = path.join("uploads", "profile-images");

    // Eski profil görselini güvenli şekilde sil
    if (user.profileImage) {
      const oldImagePath = path.join(profileDir, user.profileImage);
      if (fs.existsSync(oldImagePath)) {
        safelyDeleteFile(oldImagePath);
      }
    }

    user.profileImage = req.file.filename;
    await user.save();

    const profileImageUrl = `${BASE_URL}/${UPLOAD_BASE_PATH}/profile-images/${req.file.filename}`;

    res.status(200).json({
      success: true,
      message:
        req.locale === "de"
          ? "Profilbild erfolgreich aktualisiert."
          : req.locale === "tr"
          ? "Profil fotoğrafı başarıyla güncellendi."
          : "Profile image updated successfully.",
      profileImage: user.profileImage,
      profileImageUrl,
    });
  }
);


export const updateFullProfile = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const updateFields: Record<string, any> = { ...req.body };
    const jsonFields = ["addresses", "notifications", "socialMedia", "payment"];

    for (const field of jsonFields) {
      try {
        if (updateFields[field] !== undefined) {
          updateFields[field] = validateJsonField(updateFields[field], field);
        }
      } catch (error: any) {
        res.status(400).json({
          success: false,
          message:
            req.locale === "de"
              ? `Ungültiges Format für "${field}".`
              : req.locale === "tr"
              ? `"${field}" alanı geçersiz formatta.`
              : `Invalid format for field "${field}".`,
        });
        return;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user!.id,
      updateFields,
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    if (!updatedUser) {
      res.status(404).json({
        success: false,
        message:
          req.locale === "de"
            ? "Benutzer nicht gefunden."
            : req.locale === "tr"
            ? "Kullanıcı bulunamadı."
            : "User not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message:
        req.locale === "de"
          ? "Benutzerprofil erfolgreich aktualisiert."
          : req.locale === "tr"
          ? "Kullanıcı profili başarıyla güncellendi."
          : "User profile updated successfully.",
      user: updatedUser,
    });
  }
);


export const updateUserAddresses = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = await User.findById(req.user!.id);

    if (!user) {
      res.status(404).json({
        success: false,
        message:
          req.locale === "de"
            ? "Benutzer nicht gefunden."
            : req.locale === "tr"
            ? "Kullanıcı bulunamadı."
            : "User not found.",
      });
      return;
    }

    user.addresses = req.body.addresses;
    await user.save();

    res.status(200).json({
      success: true,
      message:
        req.locale === "de"
          ? "Adressen erfolgreich aktualisiert."
          : req.locale === "tr"
          ? "Adresler başarıyla güncellendi."
          : "Addresses updated successfully.",
      addresses: user.addresses,
    });
  }
);

