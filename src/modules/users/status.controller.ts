// controllers/admin/users.status.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId, isValidRole } from "@/core/utils/validation";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import userTranslations from "@/modules/users/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

function userT(
  key: string,
  locale: SupportedLocale,
  vars?: Record<string, string | number>
) {
  return t(key, locale, userTranslations, vars);
}

// Hassas alanları asla döndürmeyelim
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

/* ----------------------------- TOGGLE STATUS ------------------------------ */
// ✅ Kullanıcı durumunu aktif/pasif olarak değiştir
export const toggleUserStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { User } = await getTenantModels(req);

  logger.withReq.debug(req, `[Admin] toggleUserStatus | id=${id} | tenant=${req.tenant}`);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, `[Admin] Invalid user ID: ${id}`);
    res.status(400).json({ success: false, message: userT("admin.users.invalidId", locale) });
    return;
  }

  const user = await User.findOne({ _id: id, tenant: req.tenant });
  if (!user) {
    logger.withReq.warn(req, `[Admin] User not found: ${id}`);
    res.status(404).json({ success: false, message: userT("admin.users.notFound", locale) });
    return;
  }

  user.isActive = !user.isActive;
  await user.save();

  logger.withReq.info(
    req,
    `[Admin] User status changed | email=${user.email} | isActive=${user.isActive}`
  );

  res.status(200).json({
    success: true,
    message: userT(user.isActive ? "admin.users.activated" : "admin.users.blocked", locale),
    userId: String(user._id),
    isActive: user.isActive,
  });
});

/* ------------------------------ UPDATE ROLE ------------------------------- */
// ✅ Kullanıcının rolünü güncelle
export const updateUserRole = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { role } = req.body as { role?: string };
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { User } = await getTenantModels(req);

  logger.withReq.debug(
    req,
    `[Admin] updateUserRole | id=${id} | role=${role} | tenant=${req.tenant}`
  );

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, `[Admin] Invalid user ID: ${id}`);
    res.status(400).json({ success: false, message: userT("admin.users.invalidId", locale) });
    return;
  }

  if (!role || !isValidRole(role)) {
    logger.withReq.warn(req, `[Admin] Invalid role: ${role}`);
    res.status(400).json({ success: false, message: userT("admin.users.invalidRole", locale) });
    return;
  }

  // Yükseltme kısıtı: superadmin'e sadece superadmin atayabilsin
  if (role === "superadmin" && (!req.user || req.user.role !== "superadmin")) {
    res.status(403).json({
      success: false,
      message: userT("admin.users.forbiddenRoleChange", locale),
    });
    return;
  }

  // Tenant izolasyonu: findOneAndUpdate + projection
  const updated = await User.findOneAndUpdate(
    { _id: id, tenant: req.tenant },
    { role },
    { new: true, runValidators: true, projection: SAFE_PROJECTION }
  );

  if (!updated) {
    logger.withReq.warn(req, `[Admin] User not found for role update: ${id}`);
    res.status(404).json({ success: false, message: userT("admin.users.notFound", locale) });
    return;
  }

  logger.withReq.info(req, `[Admin] User role updated | email=${updated.email} | role=${updated.role}`);

  res.status(200).json({
    success: true,
    message: userT("admin.users.roleUpdated", locale),
    data: updated,
  });
});
