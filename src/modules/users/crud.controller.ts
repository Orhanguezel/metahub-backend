// src/modules/users/crud.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId, validateJsonField } from "@/core/middleware/auth/validation";
import path from "path";
import fs from "fs/promises";
import { v2 as cloudinary } from "cloudinary";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import userTranslations from "@/modules/users/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

function userT(key: string, locale: SupportedLocale, vars?: Record<string, string | number>) {
  return t(key, locale, userTranslations, vars);
}

const SAFE_PROJECTION = {
  password: 0,
  mfaSecret: 0,
  mfaBackupCodes: 0,
  otpCode: 0,
  otpExpires: 0,
  emailVerificationToken: 0,
  emailVerificationExpires: 0,
  passwordResetToken: 0,
  passwordResetExpires: 0,
} as const;

/* ---------------------------------- LIST ---------------------------------- */
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale();
  const { User } = await getTenantModels(req);

  const {
    q,
    role,
    isActive,
    emailVerified,
    page = "1",
    limit = "12",
    sortBy = "createdAt",
    sortDir = "desc",
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 12));
  const skip = (pageNum - 1) * limitNum;

  const filter: any = { tenant: req.tenant };
  if (q) {
    const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: rx }, { email: rx }, { company: rx }, { position: rx }];
  }
  if (role) filter.role = role;
  if (isActive === "true" || isActive === "false") filter.isActive = isActive === "true";
  if (emailVerified === "true" || emailVerified === "false") filter.emailVerified = emailVerified === "true";

  const allowedSorts = new Set(["createdAt", "updatedAt", "name", "email", "role"]);
  const sortField = allowedSorts.has(sortBy) ? sortBy : "createdAt";
  const sort: any = { [sortField]: sortDir === "asc" ? 1 : -1 };

  const [items, total] = await Promise.all([
    User.find(filter).select(SAFE_PROJECTION).sort(sort).skip(skip).limit(limitNum).lean(),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    message: userT("admin.users.fetched", locale),
    data: items,
    meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  });
});

/* ---------------------------------- READ ---------------------------------- */
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale();
  const { User } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, `[Admin] Invalid user ID: ${id}`);
    res.status(400).json({ success: false, message: userT("admin.users.invalidId", locale) });
    return;
  }

  const user = await User.findOne({ _id: id, tenant: req.tenant }).select(SAFE_PROJECTION).lean();
  if (!user) {
    logger.withReq.warn(req, `[Admin] User not found: ${id}`);
    res.status(404).json({ success: false, message: userT("admin.users.notFound", locale) });
    return;
  }

  res.status(200).json({
    success: true,
    message: userT("admin.users.fetchedOne", locale),
    data: user,
  });
});

/* --------------------------------- UPDATE --------------------------------- */
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale();
  const { User, AuthIdentity } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, `[Admin] Invalid user ID: ${id}`);
    res.status(400).json({ success: false, message: userT("admin.users.invalidId", locale) });
    return;
  }

  const existing = await User.findOne({ _id: id, tenant: req.tenant });
  if (!existing) {
    logger.withReq.warn(req, `[Admin] User not found for update: ${id}`);
    res.status(404).json({ success: false, message: userT("admin.users.notFound", locale) });
    return;
  }

  // Görsel hazırlığı (eskiyi temizle + yeniyi hazırla)
  let nextProfileImage = existing.profileImage;
  if (req.file) {
    try {
      const img = existing.profileImage as any;
      if (img?.publicId) await cloudinary.uploader.destroy(img.publicId);
      if (img?.url && String(img.url).startsWith(`/uploads/${req.tenant}/profile-images/`)) {
        const localPath = path.join(
          process.cwd(),
          "uploads",
          String(req.tenant),
          "profile-images",
          path.basename(img.url)
        );
        await fs.unlink(localPath).catch(() => void 0);
      }
    } catch (e) {
      logger.withReq.error(req, `[Admin] Old image cleanup error: ${e}`);
    }

    const f: any = req.file;
    if (f.cloudinary === true || f.public_id) {
      nextProfileImage = {
        url: f.path || f.url,
        thumbnail: f.thumbnail || (f.path || f.url),
        webp: f.webp || "",
        publicId: f.public_id,
      };
    } else {
      const url = `/uploads/${req.tenant}/profile-images/${f.filename}`;
      nextProfileImage = { url, thumbnail: url, webp: "" };
    }
  }

  const {
    name,
    company,
    position,
    email,
    role,
    isActive,
    phone,
    bio,
    birthDate,
    language,
    socialMedia,
    notifications,
    addresses,
    emailVerified,
  } = req.body;

  if (role && req.user && req.user.role !== "superadmin" && role === "superadmin") {
    res.status(403).json({ success: false, message: userT("admin.users.forbiddenRoleChange", locale) });
    return;
  }

  // E-posta değişirse local identity çakışmasını kontrol et
  const newEmail = typeof email === "string" ? email.trim().toLowerCase() : undefined;
  const emailChanged =
    newEmail && newEmail !== String(existing.email || "").toLowerCase();

  if (emailChanged && AuthIdentity) {
    const otherLocal = await AuthIdentity.findOne({
      tenant: req.tenant,
      provider: "local",
      providerId: newEmail,
      userId: { $ne: existing._id },
    });
    if (otherLocal) {
      res.status(409).json({ success: false, message: userT("admin.users.emailTaken", locale) });
      return;
    }
  }

  const updates: any = {
    ...(name !== undefined && { name }),
    ...(company !== undefined && { company }),
    ...(position !== undefined && { position }),
    ...(email !== undefined && { email: newEmail }),
    ...(role !== undefined && { role }),
    ...(typeof isActive === "boolean" && { isActive }),
    ...(phone !== undefined && { phone }),
    ...(bio !== undefined && { bio }),
    ...(birthDate && { birthDate: new Date(birthDate) }),
    ...(language && { language }),
    ...(typeof emailVerified === "boolean" && { emailVerified }),
    profileImage: nextProfileImage,
  };

  try {
    if (socialMedia !== undefined) updates.socialMedia = validateJsonField(socialMedia, "socialMedia");
    if (notifications !== undefined) updates.notifications = validateJsonField(notifications, "notifications");
    if (addresses !== undefined) updates.addresses = validateJsonField(addresses, "addresses");
  } catch (e: any) {
    logger.withReq.warn(req, `[Admin] JSON field validation error: ${e.message}`);
    res.status(400).json({ success: false, message: e.message });
    return;
  }

  const updated = await User.findOneAndUpdate(
    { _id: id, tenant: req.tenant },
    updates,
    { new: true, runValidators: true, projection: SAFE_PROJECTION }
  );

  if (!updated) {
    res.status(404).json({ success: false, message: userT("admin.users.notFound", locale) });
    return;
  }

  // Local identity sync (e-posta değiştiyse)
  if (emailChanged && AuthIdentity) {
    await AuthIdentity.updateOne(
      { tenant: req.tenant, userId: updated._id, provider: "local" },
      { $set: { providerId: newEmail } },
      { upsert: true }
    ).catch(() => void 0);
  }

  res.status(200).json({
    success: true,
    message: userT("admin.users.updated", locale),
    data: updated,
  });
});

/* --------------------------------- DELETE --------------------------------- */
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale();
  const { User } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, `[Admin] Invalid user ID: ${id}`);
    res.status(400).json({ success: false, message: userT("admin.users.invalidId", locale) });
    return;
  }

  const user = await User.findOne({ _id: id, tenant: req.tenant });
  if (!user) {
    logger.withReq.warn(req, `[Admin] User not found for delete: ${id}`);
    res.status(404).json({ success: false, message: userT("admin.users.notFound", locale) });
    return;
  }

  await User.deleteOne({ _id: id, tenant: req.tenant });

  // Görsel temizliği
  try {
    const img: any = user.profileImage;
    if (img?.publicId) {
      await cloudinary.uploader.destroy(img.publicId).catch(() => void 0);
    }
    if (img?.url && String(img.url).startsWith(`/uploads/${req.tenant}/profile-images/`)) {
      const localPath = path.join(
        process.cwd(),
        "uploads",
        String(req.tenant),
        "profile-images",
        path.basename(img.url)
      );
      await fs.unlink(localPath).catch(() => void 0);
    }
  } catch (e) {
    logger.withReq.error(req, `[Admin] Image delete error: ${e}`);
  }

  res.status(200).json({
    success: true,
    message: userT("admin.users.deleted", locale),
    data: { userId: id },
  });
});
