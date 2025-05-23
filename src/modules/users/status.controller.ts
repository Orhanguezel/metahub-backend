import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import {User} from "@/modules/users";
import {
  isValidObjectId,
  getUserOrFail,
  isValidRole,
} from "@/core/utils/validation";

// ✅ Kullanıcı durumunu aktif/pasif olarak değiştir
export const toggleUserStatus = asyncHandler(
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

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message:
        req.locale === "de"
          ? `Benutzer wurde erfolgreich ${
              user.isActive ? "aktiviert" : "gesperrt"
            }`
          : req.locale === "tr"
          ? `Kullanıcı başarıyla ${
              user.isActive ? "aktifleştirildi" : "engellendi"
            }`
          : `User successfully ${user.isActive ? "activated" : "blocked"}`,
      userId: String(user._id),
      isActive: user.isActive,
    });
  }
);

// ✅ Kullanıcının rolünü güncelle
export const updateUserRole = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { role } = req.body;

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

    if (!isValidRole(role)) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? "Ungültige Rolle"
            : req.locale === "tr"
            ? "Geçersiz rol"
            : "Invalid role",
      });
      return;
    }

    const user = await User.findByIdAndUpdate(
      id.trim(),
      { role },
      { new: true, runValidators: true }
    );

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
          ? "Benutzerrolle erfolgreich aktualisiert"
          : req.locale === "tr"
          ? "Kullanıcı rolü başarıyla güncellendi"
          : "Role updated successfully",
      user,
    });
  }
);
