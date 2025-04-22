import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import User from "../../modules/user/user.models";
import { getUserOrFail, validateJsonField } from "../../core/utils/validation";
import { checkPassword, hashNewPassword } from "../../services/authService";
import { safelyDeleteFile } from "../../core/utils/fileUtils";
import { BASE_URL } from "../../core/middleware/uploadMiddleware";
import fs from "fs";
import path from "path";

const PROFILE_IMAGE_DIR = "uploads/profile-images";

/**
 * @desc Get current user profile
 * @route GET /account/me
 */
export const getMyProfile = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = await User.findById(req.user!.id)
      .select("-password")
      .populate("addresses profile payment cart orders favorites");

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User profile retrieved successfully",
      user,
    });
  }
);

/**
 * @desc Update basic profile info
 * @route PUT /account/me/update
 */
export const updateMyProfile = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = await getUserOrFail(req.user!.id, res);
    if (!user) return;

    const { name, email, phone, language } = req.body;

    user.name = name ?? user.name;
    user.email = email ?? user.email;
    user.phone = phone ?? user.phone;
    user.language = language ?? user.language ?? req.locale ?? "en";

    const updated = await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
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

/**
 * @desc Change password
 * @route PUT /account/me/password
 */
export const updateMyPassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = await User.findById(req.user!.id).select("+password");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    const isMatch = await checkPassword(currentPassword, user.password);
    if (!isMatch) {
      res.status(400).json({ message: "Current password is incorrect" });
      return;
    }

    user.password = await hashNewPassword(newPassword);
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  }
);

/**
 * @desc Update notification preferences
 * @route PATCH /account/me/notifications
 */
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
      message: "Notification preferences updated",
      notifications: user.notifications,
    });
  }
);

/**
 * @desc Update social media links
 * @route PATCH /account/me/social
 */
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
      message: "Social media links updated",
      socialMedia: user.socialMedia,
    });
  }
);

/**
 * @desc Update profile image
 * @route PUT /account/me/profile-image
 */
export const updateProfileImage = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const user = await User.findById(req.user!.id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const PROFILE_IMAGE_DIR = path.join("uploads", "profile-images");

    // Eski profil fotoğrafını güvenli şekilde sil
    if (user.profileImage) {
      const oldImagePath = path.join(PROFILE_IMAGE_DIR, user.profileImage);
      if (fs.existsSync(oldImagePath)) {
        safelyDeleteFile(oldImagePath);
      }
    }

    // Yeni dosya adını kaydet
    user.profileImage = req.file.filename;
    await user.save();

    // Tam URL oluştur
    const profileImageUrl = `${BASE_URL}/uploads/profile-images/${req.file.filename}`;

    res.status(200).json({
      success: true,
      message: "Profile image updated",
      profileImage: user.profileImage,
      profileImageUrl, // frontend bu URL'yi kullanarak <Image /> ya da <img /> gösterebilir
    });
  }
);

/**
 * @desc Full profile update
 * @route PUT /account/me
 */
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
        res.status(400).json({ message: error.message });
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
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User profile updated successfully",
      user: updatedUser,
    });
  }
);

// src/controllers/user/account.controller.ts içinde yeni fonksiyon:
export const updateUserAddresses = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await User.findById(req.user!.id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    user.addresses = req.body.addresses;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Addresses updated",
      addresses: user.addresses,
    });
  }
);
