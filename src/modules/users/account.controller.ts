import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { User } from "@/modules/users";
import { getUserOrFail, validateJsonField } from "@/core/utils/validation";
import { checkPassword, hashNewPassword } from "@/services/authService";
import { safelyDeleteFile } from "@/core/utils/fileUtils";
import { BASE_URL, UPLOAD_BASE_PATH } from "@/core/middleware/uploadMiddleware";
import fs from "fs/promises";
import path from "path";

// ✅ Helper: Locale-based message
const getMessage = (locale: string, deMsg: string, trMsg: string, enMsg: string) =>
  locale === "de" ? deMsg : locale === "tr" ? trMsg : enMsg;

// ✅ Profilimi getir
export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id)
    .select("-password")
    .populate("addresses profile payment cart orders favorites");

  if (!user) {
    res.status(404).json({
      success: false,
      message: getMessage(req.locale, "Benutzer nicht gefunden.", "Kullanıcı bulunamadı.", "User not found."),
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: getMessage(req.locale, "Benutzerprofil erfolgreich abgerufen.", "Kullanıcı profili başarıyla getirildi.", "User profile retrieved successfully."),
    user,
  });
});

// ✅ Profilimi güncelle
export const updateMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserOrFail(req.user!.id, res);
  if (!user) return;

  const { name, email, phone, language } = req.body;

  user.name = name ?? user.name;
  user.email = email ?? user.email;
  user.phone = phone ?? user.phone;
  user.language = language ?? user.language ?? req.locale ?? "en";

  const updated = await user.save();

  res.status(200).json({
    success: true,
    message: getMessage(req.locale, "Profil erfolgreich aktualisiert.", "Profil başarıyla güncellendi.", "Profile updated successfully."),
    user: {
      _id: updated._id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      language: updated.language,
    },
  });
});

// ✅ Şifre güncelle
export const updateMyPassword = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id).select("+password");

  if (!user) {
    res.status(404).json({
      success: false,
      message: getMessage(req.locale, "Benutzer nicht gefunden.", "Kullanıcı bulunamadı.", "User not found."),
    });
    return;
  }

  const { currentPassword, newPassword } = req.body;

  const isMatch = await checkPassword(currentPassword, user.password);
  if (!isMatch) {
    res.status(400).json({
      success: false,
      message: getMessage(req.locale, "Das aktuelle Passwort ist falsch.", "Mevcut şifre hatalı.", "Current password is incorrect."),
    });
    return;
  }

  user.password = await hashNewPassword(newPassword);
  await user.save();

  res.status(200).json({
    success: true,
    message: getMessage(req.locale, "Passwort erfolgreich aktualisiert.", "Şifre başarıyla güncellendi.", "Password updated successfully."),
  });
});

// ✅ Bildirim ayarlarını güncelle
export const updateNotificationSettings = asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserOrFail(req.user!.id, res);
  if (!user) return;

  const { emailNotifications, smsNotifications } = req.body;

  user.notifications = {
    emailNotifications: emailNotifications ?? user.notifications?.emailNotifications,
    smsNotifications: smsNotifications ?? user.notifications?.smsNotifications,
  };

  await user.save();

  res.status(200).json({
    success: true,
    message: getMessage(req.locale, "Benachrichtigungseinstellungen aktualisiert.", "Bildirim tercihleri güncellendi.", "Notification preferences updated."),
    notifications: user.notifications,
  });
});

// ✅ Sosyal medya bağlantıları güncelle
export const updateSocialMediaLinks = asyncHandler(async (req: Request, res: Response) => {
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
    message: getMessage(req.locale, "Social-Media-Links wurden aktualisiert.", "Sosyal medya bağlantıları güncellendi.", "Social media links updated."),
    socialMedia: user.socialMedia,
  });
});

// ✅ Profil fotoğrafı güncelle
export const updateProfileImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({
      success: false,
      message: getMessage(req.locale, "Keine Datei hochgeladen.", "Dosya yüklenmedi.", "No file uploaded."),
    });
    return;
  }

  const user = await User.findById(req.user!.id);
  if (!user) {
    res.status(404).json({
      success: false,
      message: getMessage(req.locale, "Benutzer nicht gefunden.", "Kullanıcı bulunamadı.", "User not found."),
    });
    return;
  }

  const profileDir = path.join("uploads", "profile-images");

  if (user.profileImage) {
    const oldImagePath = path.join(profileDir, user.profileImage);
    try {
      await fs.unlink(oldImagePath);
    } catch {
      // Dosya yoksa problem değil
    }
  }

  user.profileImage = req.file.filename;
  await user.save();

  const profileImageUrl = `${BASE_URL}/${UPLOAD_BASE_PATH}/profile-images/${req.file.filename}`;

  res.status(200).json({
    success: true,
    message: getMessage(req.locale, "Profilbild erfolgreich aktualisiert.", "Profil fotoğrafı başarıyla güncellendi.", "Profile image updated successfully."),
    profileImage: user.profileImage,
    profileImageUrl,
  });
});

// ✅ Full profil güncelle
export const updateFullProfile = asyncHandler(async (req: Request, res: Response) => {
  const updateFields: Record<string, any> = { ...req.body };
  const jsonFields = ["addresses", "notifications", "socialMedia", "payment"];

  for (const field of jsonFields) {
    try {
      if (updateFields[field] !== undefined) {
        updateFields[field] = validateJsonField(updateFields[field], field);
      }
    } catch {
      res.status(400).json({
        success: false,
        message: getMessage(req.locale, `Ungültiges Format für "${field}".`, `"${field}" alanı geçersiz formatta.`, `Invalid format for field "${field}".`),
      });
      return;
    }
  }

  const updatedUser = await User.findByIdAndUpdate(req.user!.id, updateFields, {
    new: true,
    runValidators: true,
  }).select("-password");

  if (!updatedUser) {
    res.status(404).json({
      success: false,
      message: getMessage(req.locale, "Benutzer nicht gefunden.", "Kullanıcı bulunamadı.", "User not found."),
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: getMessage(req.locale, "Benutzerprofil erfolgreich aktualisiert.", "Kullanıcı profili başarıyla güncellendi.", "User profile updated successfully."),
    user: updatedUser,
  });
});

// ✅ Kendi hesabını sil
export const deleteMyAccount = asyncHandler(async (req: Request, res: Response) => {
  const { password } = req.body;

  // 1️⃣ Kullanıcıyı bul
  const user = await User.findById(req.user!.id);
  if (!user) {
    res.status(404).json({
      success: false,
      message: getMessage(req.locale, "Benutzer nicht gefunden.", "Kullanıcı bulunamadı.", "User not found."),
    });
    return 
  }

  // 2️⃣ Şifre kontrolü
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    res.status(400).json({
      success: false,
      message: getMessage(req.locale, "Ungültiges Passwort.", "Geçersiz şifre.", "Invalid password."),
    });
    return 
  }

  // 3️⃣ Profil fotoğrafını sil
  if (user.profileImage) {
    const profileDir = path.join(__dirname, "../../../uploads/profile-images");
    const oldImagePath = path.join(profileDir, user.profileImage);
    try {
      await fs.unlink(path.resolve(oldImagePath));
    } catch (error) {
      console.warn("Profile image could not be deleted (maybe already gone).");
    }
  }

  // 4️⃣ Hesabı sil
  await User.findByIdAndDelete(req.user!.id);

  // 5️⃣ Response
  res.status(200).json({
    success: true,
    message: getMessage(
      req.locale,
      "Konto erfolgreich gelöscht.",
      "Hesap başarıyla silindi.",
      "Account deleted successfully."
    ),
  });
});
