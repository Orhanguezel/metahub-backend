import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import type { IUserProfileImage } from "@/modules/users/types";
import crypto from "crypto";
import { passwordResetTemplate } from "@/templates/passwordReset";
import { sendEmail } from "@/services/emailService";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import userTranslations from "@/modules/users/i18n";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { sendEmailVerification } from "@/modules/users/auth.advanced.controller";

import {
  loginAndSetToken,
  logoutAndClearToken,
  hashNewPassword,
  checkPassword,
} from "@/services/authService";
import {
  validateJsonField,
  validateEmailFormat,
  isValidRole,
} from "@/core/utils/validation";

// Locale ve translation kısa yolu
function getLocale(req: Request): SupportedLocale {
  return (req.locale as SupportedLocale) || getLogLocale();
}
function userT(
  key: string,
  locale: SupportedLocale,
  vars?: Record<string, string | number>
) {
  return t(key, locale, userTranslations, vars);
}

// ✅ Register
export const registerUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const locale = getLocale(req);
    const { User } = await getTenantModels(req);

    const {
      name,
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

    // --- Validasyonlar ---
    if (!validateEmailFormat(email)) {
      logger.warn(`[REGISTER] Geçersiz e-posta: ${email}`);
      res.status(400).json({
        success: false,
        message: userT("auth.register.invalidEmail", locale),
      });
      return;
    }

    const normalizedRole = role.toLowerCase();
    if (!isValidRole(normalizedRole)) {
      logger.warn(`[REGISTER] Geçersiz rol: ${role}`);
      res.status(400).json({
        success: false,
        message: userT("auth.register.invalidRole", locale),
      });
      return;
    }

    let parsedAddresses, parsedSocialMedia, parsedNotifications;
    try {
      parsedAddresses = validateJsonField(addresses, "addresses");
      parsedSocialMedia = validateJsonField(socialMedia, "socialMedia");
      parsedNotifications = validateJsonField(notifications, "notifications");
    } catch (error: any) {
      logger.warn(`[REGISTER] JSON parse hatası: ${error.message}`);
      res.status(400).json({ success: false, message: error.message });
      return;
    }

    // Profil resmi objesi
    let profileImageObj: IUserProfileImage = {
      url: "/defaults/profile.png",
      thumbnail: "/defaults/profile-thumbnail.png",
      webp: "/defaults/profile.webp",
      publicId: "",
    };
    if (req.file) {
      if (
        (req.file as any).cloudinary === true ||
        (req.file as any).public_id
      ) {
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

    // Kayıt işlemi
    let user;
    try {
      
      user = await User.create({
        name,
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

      logger.info(`[REGISTER] Yeni kayıt: ${email} | locale: ${locale}`);
    } catch (err) {
      logger.error(`[REGISTER] Kayıt başarısız: ${email} | ${err.message}`);
      res.status(500).json({
        success: false,
        message: userT("auth.register.userCreateFail", locale),
      });
      return;
    }

    // Doğrulama e-posta gönder
    try {
      await sendEmailVerification(req, user); // Sadece user'ı ver, res'i verme!
      res.status(201).json({
        success: true,
        emailVerificationRequired: true,
        message: userT("auth.register.success", locale),
      });
      return;
    } catch (err) {
      logger.error(
        `[REGISTER] E-posta doğrulama gönderilemedi: ${user.email} | ${err.message}`
      );
      res.status(500).json({
        success: false,
        message: userT("auth.emailVerification.fail", locale),
      });
      return;
    }
  }
);

// ✅ Login
export const loginUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    const locale = getLocale(req);
    const { User } = await getTenantModels(req);

    if (!validateEmailFormat(email)) {
      logger.warn(`[LOGIN] Geçersiz e-posta: ${email}`);
      res.status(400).json({
        success: false,
        message: userT("auth.login.invalidEmail", locale),
      });
      return;
    }

    const user = await User.findOne({ email, tenant: req.tenant }).select(
      "+password +mfaEnabled +emailVerified +isActive"
    );
    if (!user) {
      logger.warn(`[LOGIN] Kullanıcı bulunamadı: ${email}`);
      res.status(401).json({
        success: false,
        message: userT("auth.login.invalidCredentials", locale),
      });
      return;
    }

    const passwordValid = await checkPassword(req, password, user.password);
    if (!passwordValid) {
      logger.warn(`[LOGIN] Hatalı şifre: ${email}`);
      res.status(401).json({
        success: false,
        message: userT("auth.login.invalidCredentials", locale),
      });
      return;
    }

    if (!user.emailVerified) {
      logger.warn(`[LOGIN] E-posta doğrulanmamış: ${email}`);
      res.status(401).json({
        success: false,
        emailVerificationRequired: true,
        message: userT("auth.login.emailNotVerified", locale),
      });
      return;
    }

    if (!user.isActive) {
      logger.warn(`[LOGIN] Hesap devre dışı: ${email}`);
      res.status(403).json({
        success: false,
        message: userT("auth.login.accountDisabled", locale),
      });
      return;
    }

    if (user.mfaEnabled) {
      logger.info(`[LOGIN] MFA gerekli: ${email}`);
      res.status(200).json({
        success: true,
        mfaRequired: true,
        message: userT("auth.login.mfaRequired", locale),
      });
      return;
    }

    await loginAndSetToken(req, res, user.id, user.role);

    logger.info(`[LOGIN] Başarılı giriş: ${email}`);

    res.status(200).json({
      success: true,
      message: userT("auth.login.success", locale),
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
      },
    });
  }
);

// ✅ Change Password
export const changePassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { currentPassword, newPassword } = req.body;
    const locale = getLocale(req);
    const { User } = await getTenantModels(req);

    const user = await User.findOne({
      _id: req.user!.id,
      tenant: req.tenant,
    }).select("+password");
    if (!user) {
      logger.warn(`[CHANGE-PASSWORD] Kullanıcı bulunamadı: ${req.user!.id}`);
      res.status(404).json({
        success: false,
        message: userT("auth.password.userNotFound", locale),
      });
      return;
    }

    if (!(await checkPassword(req, currentPassword, user.password))) {
      logger.warn(`[CHANGE-PASSWORD] Yanlış mevcut şifre: ${user.email}`);
      res.status(401).json({
        success: false,
        message: userT("auth.password.invalidCurrent", locale),
      });
      return;
    }

    if (currentPassword === newPassword) {
      logger.warn(`[CHANGE-PASSWORD] Eski ve yeni şifre aynı: ${user.email}`);
      res.status(400).json({
        success: false,
        message: userT("auth.password.sameAsCurrent", locale),
      });
      return;
    }

    user.password = await hashNewPassword(req, newPassword);
    await user.save();

    logger.info(`[CHANGE-PASSWORD] Şifre değiştirildi: ${user.email}`);

    res
      .status(200)
      .json({ success: true, message: userT("auth.password.success", locale) });
  }
);

// ✅ Logout
export const logoutUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const locale = getLocale(req);
    logoutAndClearToken(req, res);
    logger.info(
      `[LOGOUT] Kullanıcı çıkış yaptı: ${req.user?.id ?? "Bilinmiyor"}`
    );
    res
      .status(200)
      .json({ success: true, message: userT("auth.logout.success", locale) });
  }
);

// ✅ Forgot Password
export const forgotPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body;
    const locale = getLocale(req);
    const { User } = await getTenantModels(req);

    const user = await User.findOne({ email, tenant: req.tenant });
    if (!user) {
      logger.warn(`[FORGOT-PASSWORD] Kullanıcı bulunamadı: ${email}`);
      res.status(404).json({
        success: false,
        message: userT("auth.forgot.userNotFound", locale),
      });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const html = passwordResetTemplate({
      name: user.name,
      resetLink,
    });

    await sendEmail({
      to: user.email,
      subject: userT("auth.forgot.subject", locale),
      html,
    });

    logger.info(
      `[FORGOT-PASSWORD] Şifre sıfırlama e-postası gönderildi: ${user.email}`
    );

    res
      .status(200)
      .json({ success: true, message: userT("auth.forgot.success", locale) });
  }
);

// ✅ Reset Password
export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { token } = req.params;
    const { newPassword } = req.body;
    const locale = getLocale(req);
    const { User } = await getTenantModels(req);

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      tenant: req.tenant,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      logger.warn(`[RESET-PASSWORD] Geçersiz veya süresi dolmuş token.`);
      res.status(400).json({
        success: false,
        message: userT("auth.reset.invalidOrExpired", locale),
      });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      logger.warn(`[RESET-PASSWORD] Geçersiz yeni şifre.`);
      res.status(400).json({
        success: false,
        message: userT("auth.reset.invalidNewPassword", locale),
      });
      return;
    }

    user.password = await hashNewPassword(req, newPassword);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    logger.info(`[RESET-PASSWORD] Şifre sıfırlandı: ${user.email}`);

    res
      .status(200)
      .json({ success: true, message: userT("auth.reset.success", locale) });
  }
);
