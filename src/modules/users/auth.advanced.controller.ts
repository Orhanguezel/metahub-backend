import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import crypto from "crypto";
import { User } from "./users.models";
import { sendEmail } from "@/services/emailService";
import { sendSms } from "@/services/smsService";
import { generateOtpCode } from "@/core/utils/otp";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import userTranslations from "@/modules/users/i18n";
import type { SupportedLocale } from "@/types/common";

// Dil ve log için kısa yol
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

// ✅ E-posta Doğrulama Gönder
export const sendEmailVerification = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body;
    const locale = getLocale(req);

    if (!email) {
      logger.warn(`[EMAIL-VERIFICATION] E-posta eksik.`);
      res.status(400).json({
        success: false,
        message: userT("error.emailRequired", locale),
      });
      return;
    }
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn(`[EMAIL-VERIFICATION] Kullanıcı bulunamadı: ${email}`);
      res
        .status(404)
        .json({ success: false, message: userT("error.userNotFound", locale) });
      return;
    }
    if (user.emailVerified) {
      logger.info(`[EMAIL-VERIFICATION] Zaten doğrulanmış: ${email}`);
      res.status(200).json({
        success: true,
        message: userT("email.alreadyVerified", locale),
      });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.emailVerificationToken = token;
    user.emailVerificationExpires = new Date(Date.now() + 1000 * 60 * 60 * 6);
    await user.save();

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;
    await sendEmail({
      to: user.email,
      subject: userT("email.verification.subject", locale),
      html: `
      <p>${userT("email.verification.body", locale)}</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
    `,
    });

    logger.info(`[EMAIL-VERIFICATION] E-posta gönderildi: ${email}`);
    res.status(200).json({
      success: true,
      message: userT("email.verification.sent", locale),
    });
  }
);

// ✅ E-posta doğrula
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  const locale = getLocale(req);

  if (!token) {
    logger.warn(`[EMAIL-VERIFY] Token eksik.`);
    res
      .status(400)
      .json({ success: false, message: userT("error.tokenRequired", locale) });
    return;
  }

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() },
  });

  if (!user) {
    logger.warn(`[EMAIL-VERIFY] Geçersiz veya süresi dolmuş token.`);
    res.status(400).json({
      success: false,
      message: userT("error.tokenInvalidOrExpired", locale),
    });
    return;
  }

  user.emailVerified = true;
  user.isActive = true;
  user.verifiedAt = new Date();
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  logger.info(`[EMAIL-VERIFY] Doğrulama tamamlandı: ${user.email}`);
  res.status(200).json({
    success: true,
    message: userT("email.verification.success", locale),
  });
});

// --- OTP (EMAIL/SMS) ---

export const sendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, via = "email" } = req.body;
  const locale = getLocale(req);

  if (!email) {
    logger.warn(`[OTP] E-posta eksik.`);
    res
      .status(400)
      .json({ success: false, message: userT("error.emailRequired", locale) });
    return;
  }
  const user = await User.findOne({ email });
  if (!user) {
    logger.warn(`[OTP] Kullanıcı bulunamadı: ${email}`);
    res
      .status(404)
      .json({ success: false, message: userT("error.userNotFound", locale) });
    return;
  }

  const otpCode = generateOtpCode(6);
  user.otpCode = otpCode;
  user.otpExpires = new Date(Date.now() + 1000 * 60 * 10);
  await user.save();

  if (via === "sms" && user.phone) {
    await sendSms(user.phone, `${otpCode} - ${userT("otp.smsBody", locale)}`);
    logger.info(`[OTP] SMS ile kod gönderildi: ${user.phone}`);
  } else {
    await sendEmail({
      to: user.email,
      subject: userT("otp.emailSubject", locale),
      html: `
        <h2>${otpCode}</h2>
        <p>${userT("otp.emailBody", locale)}</p>
      `,
    });
    logger.info(`[OTP] E-posta ile kod gönderildi: ${user.email}`);
  }

  res.status(200).json({
    success: true,
    message: userT("otp.sent", locale),
    via,
  });
});

// ✅ OTP Doğrula
export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, code } = req.body;
  const locale = getLocale(req);

  if (!email || !code) {
    logger.warn(`[OTP-VERIFY] Email veya kod eksik.`);
    res.status(400).json({
      success: false,
      message: userT("error.emailAndCodeRequired", locale),
    });
    return;
  }
  const user = await User.findOne({
    email,
    otpCode: code,
    otpExpires: { $gt: new Date() },
  });
  if (!user) {
    logger.warn(`[OTP-VERIFY] Kod geçersiz veya süresi dolmuş.`);
    res.status(400).json({
      success: false,
      message: userT("error.otpInvalidOrExpired", locale),
    });
    return;
  }

  user.otpCode = undefined;
  user.otpExpires = undefined;
  user.isActive = true;
  await user.save();

  logger.info(`[OTP-VERIFY] Başarıyla doğrulandı: ${email}`);
  res
    .status(200)
    .json({ success: true, message: userT("otp.verified", locale) });
});

export const resendOtp = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    logger.info(`[OTP-RESEND] Tekrar gönderiliyor...`);
    return sendOtp(req, res, next);
  }
);

// --- MFA (Google Authenticator - TOTP) ---

export const enableMfa = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id);
  const locale = getLocale(req);
  if (!user) {
    logger.warn(`[MFA-ENABLE] Kullanıcı bulunamadı: ${req.user!.id}`);
    res
      .status(404)
      .json({ success: false, message: userT("error.userNotFound", locale) });
    return;
  }

  const secret = speakeasy.generateSecret({
    name: `Ensotek (${user.email})`,
    length: 32,
  });

  user.mfaSecret = secret.base32;
  user.mfaEnabled = false;
  await user.save();

  const otpauthUrl = secret.otpauth_url!;
  const qrImageUrl = await qrcode.toDataURL(otpauthUrl);

  logger.info(`[MFA-ENABLE] MFA başlatıldı: ${user.email}`);

  res.status(200).json({
    success: true,
    message: userT("mfa.initialized", locale),
    otpauthUrl,
    qrImageUrl,
    mfaEnabled: false,
  });
});

// ✅ MFA Kod Doğrulama
export const verifyMfa = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.body;
  const locale = getLocale(req);

  if (!code) {
    logger.warn(`[MFA-VERIFY] Kod eksik.`);
    res
      .status(400)
      .json({ success: false, message: userT("error.codeRequired", locale) });
    return;
  }
  const user = await User.findById(req.user!.id).select("+mfaSecret");
  if (!user || !user.mfaSecret) {
    logger.warn(`[MFA-VERIFY] MFA tanımlı değil: ${req.user!.id}`);
    res
      .status(404)
      .json({ success: false, message: userT("error.mfaNotSet", locale) });
    return;
  }

  const verified = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: "base32",
    token: code,
    window: 2,
  });

  if (!verified) {
    logger.warn(`[MFA-VERIFY] Kod geçersiz: ${user.email}`);
    res
      .status(400)
      .json({ success: false, message: userT("error.invalidCode", locale) });
    return;
  }

  user.mfaEnabled = true;
  await user.save();

  logger.info(`[MFA-VERIFY] MFA etkinleştirildi: ${user.email}`);

  res.status(200).json({
    success: true,
    message: userT("mfa.enabled", locale),
    mfaEnabled: true,
  });
});
