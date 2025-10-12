// src/modules/users/auth.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import type { IUserProfileImage, IUser } from "@/modules/users/types/user.types";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import userTranslations from "@/modules/users/i18n";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { sendEmailVerification } from "@/modules/users/advanced/auth.advanced.controller";

import type { Address } from "@/modules/address/types";
import type { SocialMedia, Notifications } from "@/modules/users/types/user.types";

// ✅ Validasyon / hash
import {
  validateJsonField,
  validateEmailFormat,
  isValidRole,
} from "@/core/middleware/auth/validation";
import { checkPassword, hashNewPassword } from "@/services/authService";

// ✅ Oturum servisleri
import { issueSession, clearSession } from "@/modules/users/services/session.service";
import { changePasswordService } from "@/modules/users/services/password-change.service";

// ✅ Yeni şifre reset servisleri
import {
  requestPasswordReset,
  resetPasswordWithCodeOrToken,
} from "@/modules/users/services/password-reset.service";

/* ----------------------------- locale helpers ---------------------------- */
function getLocale(req: Request): SupportedLocale {
  return (req.locale as SupportedLocale) || getLogLocale();
}
function userT(key: string, locale: SupportedLocale, vars?: Record<string, string | number>) {
  return t(key, locale, userTranslations, vars);
}

/* -------------------------------- REGISTER ------------------------------- */
export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const locale = getLocale(req);
  const { User, Customer } = await getTenantModels(req);

  const {
    name,
    company,
    customerId: reqCustomerId,
    position,
    email,
    password,
    role = "user",
    phone,
    addresses = [],
    bio = "",
    birthDate,
    socialMedia = {},
    notifications = { emailNotifications: true, smsNotifications: false },
  } = req.body;

  if (!validateEmailFormat(email)) {
    logger.withReq.warn(req, `[REGISTER] Geçersiz e-posta: ${email}`);
    res.status(400).json({ success: false, message: userT("auth.register.invalidEmail", locale) });
    return;
  }
  const normalizedRole = String(role).toLowerCase();
  if (!isValidRole(normalizedRole)) {
    logger.withReq.warn(req, `[REGISTER] Geçersiz rol: ${role}`);
    res.status(400).json({ success: false, message: userT("auth.register.invalidRole", locale) });
    return;
  }

  let parsedAddresses: Address[] = [];
  let parsedSocialMedia: SocialMedia = {};
  let parsedNotifications: Notifications = {};
  try {
    parsedAddresses = validateJsonField(addresses, "addresses") as Address[];
    parsedSocialMedia = validateJsonField(socialMedia, "socialMedia") as SocialMedia;
    parsedNotifications = validateJsonField(notifications, "notifications") as Notifications;
  } catch (error: any) {
    logger.withReq.warn(req, `[REGISTER] JSON parse hatası: ${error.message}`);
    res.status(400).json({ success: false, message: error.message });
    return;
  }

  // Profil resmi
  let profileImageObj: IUserProfileImage = {
    url: "/defaults/profile.png",
    thumbnail: "/defaults/profile-thumbnail.png",
    webp: "/defaults/profile.webp",
    publicId: "",
  };
  if (req.file) {
    if ((req.file as any).cloudinary === true || (req.file as any).public_id) {
      profileImageObj = {
        url: (req.file as any).path || (req.file as any).url,
        thumbnail: (req.file as any).thumbnail || (req.file as any).url,
        webp: (req.file as any).webp || "",
        publicId: (req.file as any).public_id || "",
      };
    } else {
      profileImageObj = {
        url: `/uploads/profile-images/${req.file.filename}`,
        thumbnail: `/uploads/profile-images/${req.file.filename}`,
        webp: "",
        publicId: "",
      };
    }
  }

  // customerId opsiyonel zinciri
  let finalCustomerId: string | undefined;
  if (reqCustomerId) {
    const customer = await Customer.findOne({ _id: reqCustomerId, tenant: req.tenant });
    if (customer) finalCustomerId = customer._id.toString();
  }
  if (!finalCustomerId) {
    const existingCustomer = await Customer.findOne({ email, tenant: req.tenant });
    if (existingCustomer) finalCustomerId = existingCustomer._id.toString();
  }
  if (!finalCustomerId && normalizedRole === "customer") {
    const createdCustomer = await Customer.create({
      companyName: company || name,
      contactName: name,
      email,
      phone,
      tenant: req.tenant,
      addresses: parsedAddresses,
    });
    finalCustomerId = createdCustomer._id.toString();
  }

  let user: IUser;
  try {
    user = await User.create({
      name,
      company,
      customerId: finalCustomerId,
      position,
      tenant: req.tenant,
      email,
      password: await hashNewPassword(req, password),
      role: normalizedRole,
      phone,
      addresses: parsedAddresses,
      bio,
      birthDate,
      socialMedia: parsedSocialMedia,
      notifications: parsedNotifications,
      profileImage: profileImageObj,
    });
  } catch (err: any) {
    logger.withReq.error(req, `[REGISTER] Kullanıcı oluşturulamadı: ${email} | ${err.message}`);
    res.status(500).json({ success: false, message: userT("auth.register.userCreateFail", locale) });
    return;
  }

  logger.withReq.info(req, `[REGISTER] Yeni kayıt: ${email} | locale: ${locale}`);

  // E-posta doğrulama (tenant-aware)
  try {
    await sendEmailVerification(req, res); // handler kendi response'unu yazar
    return;
  } catch (err: any) {
    logger.withReq.error(req, `[REGISTER] E-posta doğrulama gönderilemedi: ${user.email} | ${err.message}`);
    res.status(500).json({ success: false, message: userT("auth.emailVerification.fail", locale) });
    return;
  }
});

/* ---------------------------------- LOGIN -------------------------------- */
export const loginUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  const locale = getLocale(req);
  const { User } = await getTenantModels(req);

  if (!validateEmailFormat(email)) {
    logger.withReq.warn(req, `[LOGIN] Geçersiz e-posta: ${email}`);
    res.status(400).json({ success: false, message: userT("auth.login.invalidEmail", locale) });
    return;
  }

  const user = await User.findOne({ email, tenant: req.tenant }).select(
    "+password +mfaEnabled +emailVerified +isActive"
  );
  if (!user) {
    logger.withReq.warn(req, `[LOGIN] Kullanıcı bulunamadı: ${email}`);
    res.status(401).json({ success: false, message: userT("auth.login.invalidCredentials", locale) });
    return;
  }

  const passwordValid = await checkPassword(req, password, user.password);
  if (!passwordValid) {
    logger.withReq.warn(req, `[LOGIN] Hatalı şifre: ${email}`);
    res.status(401).json({ success: false, message: userT("auth.login.invalidCredentials", locale) });
    return;
  }

  if (!user.emailVerified) {
    logger.withReq.warn(req, `[LOGIN] E-posta doğrulanmamış: ${email}`);
    res.status(401).json({
      success: false,
      emailVerificationRequired: true,
      message: userT("auth.login.emailNotVerified", locale),
    });
    return;
  }

  if (!user.isActive) {
    logger.withReq.warn(req, `[LOGIN] Hesap devre dışı: ${email}`);
    res.status(403).json({ success: false, message: userT("auth.login.accountDisabled", locale) });
    return;
  }

  if (user.mfaEnabled) {
    logger.withReq.info(req, `[LOGIN] MFA gerekli: ${email}`);
    res.status(200).json({
      success: true,
      mfaRequired: true,
      message: userT("auth.login.mfaRequired", locale),
    });
    return;
  }

  issueSession(req, res, { id: user.id, role: user.role });

  logger.withReq.info(req, `[LOGIN] Başarılı giriş: ${email}`);
  res.status(200).json({
    success: true,
    message: userT("auth.login.success", locale),
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      customerId: user.customerId,
      company: user.company,
      position: user.position,
      phone: user.phone,
    },
  });
});

/* --------------------------- CHANGE PASSWORD ----------------------------- */
export const changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const locale = getLocale(req);
  const { currentPassword, newPassword } = req.body;

  if (!req.user) {
    res.status(401).json({ success: false, message: userT("auth.password.userNotFound", locale) });
    return;
  }
  if (typeof currentPassword !== "string" || !currentPassword?.trim()) {
    res.status(400).json({ success: false, message: userT("auth.password.invalidCurrent", locale) });
    return;
  }
  if (typeof newPassword !== "string" || newPassword.length < 6) {
    res.status(400).json({ success: false, message: userT("validation.newPassword.min", locale, { min: 6 }) });
    return;
  }

  try {
    const updated = await changePasswordService(req, req.user.id, currentPassword, newPassword);
    // Parola değişiminde oturumu yenilemek iyi pratik:
    issueSession(req, res, { id: updated._id.toString(), role: updated.role });
    logger.withReq.info(req, `[CHANGE-PASSWORD] Şifre değiştirildi: ${updated.email}`);
    res.status(200).json({ success: true, message: userT("auth.password.success", locale) });
  } catch (e: any) {
    const code = e.status || 500;
    const message =
      code === 401
        ? userT("auth.password.invalidCurrent", locale)
        : code === 422
          ? userT("auth.password.sameAsCurrent", locale)
          : "Password change failed";
    res.status(code).json({ success: false, message });
  }
});

/* ---------------------------------- LOGOUT -------------------------------- */
export const logoutUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const locale = getLocale(req);
  clearSession(req, res);
  logger.withReq.info(req, `[LOGOUT] Kullanıcı çıkış yaptı: ${req.user?.id ?? "Bilinmiyor"}`);
  res.status(200).json({ success: true, message: userT("auth.logout.success", locale) });
});

/* ---------------------------- FORGOT PASSWORD ---------------------------- */
/**
 * Not: Şifre sıfırlama isteği servis tarafından oluşturulur.
 * Güvenlik gereği _her zaman_ 200 döneriz (kullanıcı var/yok sızdırmayız).
 * E-posta gönderimi ayrı bir işleyici/worker’da yapılabilir (servis DEV modda code/token’ı döndürür).
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const locale = getLocale(req);

  await requestPasswordReset(req, String(email || ""));

  logger.withReq.info(req, `[FORGOT-PASSWORD] İstek alındı (tenant=${req.tenant})`);
  res.status(200).json({ success: true, message: userT("auth.forgot.success", locale) });
});

/* ----------------------------- RESET PASSWORD ---------------------------- */
/**
 * Rota: POST /reset-password/:token
 * Body: { newPassword, email? }  ← email opsiyonel; yoksa token’dan lookup yaparız.
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;
  const { newPassword, email } = req.body as { newPassword?: string; email?: string };
  const locale = getLocale(req);

  if (!newPassword || newPassword.length < 6) {
    logger.withReq.warn(req, `[RESET-PASSWORD] Geçersiz yeni şifre.`);
    res.status(400).json({ success: false, message: userT("auth.reset.invalidNewPassword", locale) });
    return;
  }

  let finalEmail = (email || "").trim().toLowerCase();

  // Email gönderilmediyse token’dan çözmeye çalış
  if (!finalEmail) {
    const { PasswordReset } = await getTenantModels(req);
    const pr = await PasswordReset.findOne({
      tenant: req.tenant,
      token: String(token || "").trim(),
      usedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!pr) {
      logger.withReq.warn(req, `[RESET-PASSWORD] Geçersiz veya süresi dolmuş token.`);
      res.status(400).json({ success: false, message: userT("auth.reset.invalidOrExpired", locale) });
      return;
    }
    finalEmail = pr.email;
  }

  try {
    await resetPasswordWithCodeOrToken(req, {
      email: finalEmail,
      token: String(token || "").trim(),
      newPassword: String(newPassword),
    });

    logger.withReq.info(req, `[RESET-PASSWORD] Şifre sıfırlandı | ${finalEmail}`);
    res.status(200).json({ success: true, message: userT("auth.reset.success", locale) });
  } catch (e: any) {
    const code = e.status || 400;
    const message = code === 422
      ? userT("auth.reset.invalidOrExpired", locale)
      : userT("auth.reset.invalidOrExpired", locale);
    res.status(code).json({ success: false, message });
  }
});
