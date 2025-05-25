import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { User } from "@/modules/users";
import { getUserOrFail, validateJsonField } from "@/core/utils/validation";
import { checkPassword, hashNewPassword } from "@/services/authService";
import { safelyDeleteFile } from "@/core/utils/fileUtils";
import { BASE_URL, UPLOAD_BASE_PATH } from "@/core/middleware/uploadMiddleware";
import fs from "fs/promises";
import path from "path";
import { v2 as cloudinary } from "cloudinary"; // Cloudinary integration
import {
  getFallbackThumbnail,
  processImageLocal,
  shouldProcessImage,
} from "@/core/utils/uploadUtils";
import { getImagePath } from "@/core/utils/uploadUtils";

// ✅ Helper: Locale-based message
const getMessage = (
  locale: string,
  deMsg: string,
  trMsg: string,
  enMsg: string
) => (locale === "de" ? deMsg : locale === "tr" ? trMsg : enMsg);

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



// ✅ Profilimi getir
export const getMyProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await User.findById(req.user!.id)
      .select("-password")
      .populate("addresses profile payment cart orders favorites");

    if (!user) {
      res.status(404).json({
        success: false,
        message: getMessage(
          req.locale,
          "Benutzer nicht gefunden.",
          "Kullanıcı bulunamadı.",
          "User not found."
        ),
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: getMessage(
        req.locale,
        "Benutzerprofil erfolgreich abgerufen.",
        "Kullanıcı profili başarıyla getirildi.",
        "User profile retrieved successfully."
      ),
      user,
    });
  }
);

// ✅ Profilimi güncelle
export const updateMyProfile = asyncHandler(
  async (req: Request, res: Response) => {
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
      message: getMessage(
        req.locale,
        "Profil erfolgreich aktualisiert.",
        "Profil başarıyla güncellendi.",
        "Profile updated successfully."
      ),
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
    const user = await User.findById(req.user!.id).select("+password");

    if (!user) {
      res.status(404).json({
        success: false,
        message: getMessage(
          req.locale,
          "Benutzer nicht gefunden.",
          "Kullanıcı bulunamadı.",
          "User not found."
        ),
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    const isMatch = await checkPassword(currentPassword, user.password);
    if (!isMatch) {
      res.status(400).json({
        success: false,
        message: getMessage(
          req.locale,
          "Das aktuelle Passwort ist falsch.",
          "Mevcut şifre hatalı.",
          "Current password is incorrect."
        ),
      });
      return;
    }

    user.password = await hashNewPassword(newPassword);
    await user.save();

    res.status(200).json({
      success: true,
      message: getMessage(
        req.locale,
        "Passwort erfolgreich aktualisiert.",
        "Şifre başarıyla güncellendi.",
        "Password updated successfully."
      ),
    });
  }
);

// ✅ Bildirim ayarlarını güncelle
export const updateNotificationSettings = asyncHandler(
  async (req: Request, res: Response) => {
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
      message: getMessage(
        req.locale,
        "Benachrichtigungseinstellungen aktualisiert.",
        "Bildirim tercihleri güncellendi.",
        "Notification preferences updated."
      ),
      notifications: user.notifications,
    });
  }
);

// ✅ Sosyal medya bağlantıları güncelle
export const updateSocialMediaLinks = asyncHandler(
  async (req: Request, res: Response) => {
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
      message: getMessage(
        req.locale,
        "Social-Media-Links wurden aktualisiert.",
        "Sosyal medya bağlantıları güncellendi.",
        "Social media links updated."
      ),
      socialMedia: user.socialMedia,
    });
  }
);

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

  // --- Eski görseli sil (About ile aynı)
  if (user.profileImage) {
    const img = user.profileImage as any;
    if (img.publicId) {
      try { await cloudinary.uploader.destroy(img.publicId); } catch {}
    }
    if (img.url && img.url.startsWith("/uploads/profile-images/")) {
      try {
        const localPath = path.join(process.cwd(), "uploads", "profile-images", path.basename(img.url));
        await fs.unlink(localPath);
      } catch {}
    }
    if (typeof img === "string") {
      try {
        const localPath = path.join(process.cwd(), "uploads", "profile-images", img);
        await fs.unlink(localPath);
      } catch {}
    }
  }

  // --- YENİ GÖRSELİ KAYDET (birebir About gibi)
  const profileImage = await processUploadedProfileImage(req.file);

  user.profileImage = profileImage;
  await user.save();

  res.status(200).json({
    success: true,
    message: getMessage(req.locale, "Profilbild erfolgreich aktualisiert.", "Profil fotoğrafı başarıyla güncellendi.", "Profile image updated successfully."),
    profileImage: user.profileImage,
  });
});



// ✅ Full profil güncelle
export const updateFullProfile = asyncHandler(
  async (req: Request, res: Response) => {
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
          message: getMessage(
            req.locale,
            `Ungültiges Format für "${field}".`,
            `"${field}" alanı geçersiz formatta.`,
            `Invalid format for field "${field}".`
          ),
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
        message: getMessage(
          req.locale,
          "Benutzer nicht gefunden.",
          "Kullanıcı bulunamadı.",
          "User not found."
        ),
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: getMessage(
        req.locale,
        "Benutzerprofil erfolgreich aktualisiert.",
        "Kullanıcı profili başarıyla güncellendi.",
        "User profile updated successfully."
      ),
      user: updatedUser,
    });
  }
);
// ✅ Kendi hesabını sil (Cloudinary + local profil resmi siler)
export const deleteMyAccount = asyncHandler(async (req: Request, res: Response) => {
  const { password } = req.body;

  const user = await User.findById(req.user!.id);
  if (!user) {
    res.status(404).json({
      success: false,
      message: getMessage(req.locale, "Benutzer nicht gefunden.", "Kullanıcı bulunamadı.", "User not found."),
    });
    return;
  }

  // Şifre kontrolü
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    res.status(400).json({
      success: false,
      message: getMessage(req.locale, "Ungültiges Passwort.", "Geçersiz şifre.", "Invalid password."),
    }); 
    return;
  }

  // Profil fotoğrafını sil (About ile aynı mantık)
  if (user.profileImage) {
    const img = user.profileImage as any;
    if (img && img.publicId) {
      try { await cloudinary.uploader.destroy(img.publicId); } catch {}
    }
    if (img && img.url && img.url.startsWith("/uploads/profile-images/")) {
      try {
        const localPath = path.join(process.cwd(), "uploads", "profile-images", path.basename(img.url));
        await fs.unlink(localPath);
      } catch {}
    }
    if (typeof img === "string") {
      try {
        const localPath = path.join(process.cwd(), "uploads", "profile-images", img);
        await fs.unlink(localPath);
      } catch {}
    }
  }

  await User.findByIdAndDelete(req.user!.id);

  res.status(200).json({
    success: true,
    message: getMessage(req.locale, "Konto erfolgreich gelöscht.", "Hesap başarıyla silindi.", "Account deleted successfully."),
  });
});

