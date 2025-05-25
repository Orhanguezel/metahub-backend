// src/modules/users/auth.advanced.controller.ts

import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import crypto from "crypto";
import { User } from "./users.models";
import { sendEmail } from "@/services/emailService";
import { sendSms } from "@/services/smsService";
import { generateOtpCode } from "@/core/utils/otp";
import { getMessage } from "@/core/utils/langHelpers";
import speakeasy from "speakeasy";
import qrcode from "qrcode";

// --- EMAIL VERIFICATION ---

/**
 * Kullanıcıya e-posta doğrulama linki gönderir.
 */
export const sendEmailVerification = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ success: false, message: getMessage(req.locale, "E-Mail ist erforderlich.", "E-posta gereklidir.", "Email is required.") });
    return 
  }
  const user = await User.findOne({ email });
  if (!user) {
     res.status(404).json({ success: false, message: getMessage(req.locale, "Benutzer nicht gefunden.", "Kullanıcı bulunamadı.", "User not found.") });
     return
  }
  if (user.emailVerified) {
     res.status(200).json({ success: true, message: getMessage(req.locale, "E-Mail bereits verifiziert.", "E-posta zaten doğrulanmış.", "Email already verified.") });return
  }

  const token = crypto.randomBytes(32).toString("hex");
  user.emailVerificationToken = token;
  user.emailVerificationExpires = new Date(Date.now() + 1000 * 60 * 60 * 6); // 6 saat geçerli
  await user.save();

  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;
  await sendEmail({
    to: user.email,
    subject: getMessage(req.locale, "E-Mail-Verifizierung", "E-posta Doğrulama", "Email Verification"),
    html: `
      <p>${getMessage(req.locale, "Bitte verifiziere deine E-Mail-Adresse.", "Lütfen e-posta adresinizi doğrulayın.", "Please verify your email address.")}</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
    `,
  });

   res.status(200).json({ success: true, message: getMessage(req.locale, "Bestätigungslink gesendet.", "Doğrulama linki gönderildi.", "Verification link sent.") });return
});

/**
 * Kullanıcının e-posta adresini doğrular.
 */
/**
 * Kullanıcının e-posta adresini doğrular.
 */
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  console.log("🔎 Gelen token:", token);

  if (!token) {
     console.log("❌ Token eksik!");
     res.status(400).json({ success: false, message: getMessage(req.locale, "Token ist erforderlich.", "Token gereklidir.", "Token is required.") });
     return;
  }

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() },
  });

  console.log("🧑 Kullanıcı bulundu mu?", !!user);
  if (user) {
    console.log("🧑 Kullanıcı:", {
      _id: user._id,
      email: user.email,
      tokenDb: user.emailVerificationToken,
      expiresDb: user.emailVerificationExpires,
      emailVerified: user.emailVerified,
    });
  }

  if (!user) {
     console.log("❌ Kullanıcı bulunamadı veya token süresi doldu!");
     res.status(400).json({ success: false, message: getMessage(req.locale, "Token ungültig oder abgelaufen.", "Token geçersiz veya süresi dolmuş.", "Invalid or expired token.") });
     return;
  }

  user.emailVerified = true;
  user.isActive = true;
  user.verifiedAt = new Date();
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;

  // Kaydetmeden önce güncel değerleri logla
  console.log("✅ Onaylandı, kaydedilecek alanlar:", {
    emailVerified: user.emailVerified,
    verifiedAt: user.verifiedAt,
    emailVerificationToken: user.emailVerificationToken,
    emailVerificationExpires: user.emailVerificationExpires,
  });

  await user.save();

  console.log("✅ Kaydedildi!");
  res.status(200).json({ success: true, message: getMessage(req.locale, "E-Mail erfolgreich verifiziert.", "E-posta başarıyla doğrulandı.", "Email verified successfully.") });
  return;
});

// --- OTP (EMAIL/SMS) ---

/**
 * E-posta veya SMS ile OTP (tek kullanımlık kod) gönderir.
 */
export const sendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, via = "email" } = req.body; // via: "email" | "sms"
  if (!email) {
     res.status(400).json({ success: false, message: getMessage(req.locale, "E-Mail ist erforderlich.", "E-posta gereklidir.", "Email is required.") });
     return
  }
  const user = await User.findOne({ email });
  if (!user) {
    res.status(404).json({ success: false, message: getMessage(req.locale, "Benutzer nicht gefunden.", "Kullanıcı bulunamadı.", "User not found.") });
    return 
  }

  const otpCode = generateOtpCode(6);
  user.otpCode = otpCode;
  user.otpExpires = new Date(Date.now() + 1000 * 60 * 10); // 10 dk geçerli
  await user.save();

  if (via === "sms" && user.phone) {
    await sendSms(user.phone, `${otpCode} - ${getMessage(req.locale, "Dein Einmal-Code zum Login.", "Giriş için tek kullanımlık kodunuz.", "Your one-time code for login.")}`);
  } else {
    await sendEmail({
      to: user.email,
      subject: getMessage(req.locale, "Dein Sicherheitscode", "Güvenlik Kodunuz", "Your Security Code"),
      html: `
        <h2>${otpCode}</h2>
        <p>${getMessage(req.locale, "Dein Einmal-Code zum Login.", "Giriş için tek kullanımlık kodunuz.", "Your one-time code for login.")}</p>
      `,
    });
  }

   res.status(200).json({
    success: true,
    message: getMessage(req.locale, "OTP-Code gesendet.", "OTP kodu gönderildi.", "OTP code sent."),
    via: via,
  });
  return
});

/**
 * OTP kodunu doğrular.
 */
export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, code } = req.body;
  if (!email || !code) {
     res.status(400).json({ success: false, message: getMessage(req.locale, "E-Mail und Code sind erforderlich.", "E-posta ve kod gereklidir.", "Email and code are required.") });
     return
  }
  const user = await User.findOne({
    email,
    otpCode: code,
    otpExpires: { $gt: new Date() },
  });
  if (!user) {
     res.status(400).json({ success: false, message: getMessage(req.locale, "Ungültiger oder abgelaufener Code.", "Kod geçersiz veya süresi dolmuş.", "Invalid or expired code.") });
     return
  }

  user.otpCode = undefined;
  user.otpExpires = undefined;
  user.isActive = true;
  await user.save();

   res.status(200).json({ success: true, message: getMessage(req.locale, "OTP erfolgreich verifiziert.", "OTP başarıyla doğrulandı.", "OTP verified successfully.") });return
});

/**
 * OTP kodunu tekrar gönderir.
 */
export const resendOtp = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // sendOtp asyncHandler ile, next göndermek gerekirse de destekli
  return sendOtp(req, res, next);
});

// --- MFA (Google Authenticator - TOTP) ---

/**
 * Kullanıcıya MFA secret'ı ve QR kodu gönderir.
 */
export const enableMfa = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id);
  if (!user) {
     res.status(404).json({ success: false, message: getMessage(req.locale, "Benutzer nicht gefunden.", "Kullanıcı bulunamadı.", "User not found.") });
     return
  }

  // Secret oluştur
  const secret = speakeasy.generateSecret({
    name: `Ensotek (${user.email})`,
    length: 32,
  });

  user.mfaSecret = secret.base32;
  user.mfaEnabled = false;
  await user.save();

  const otpauthUrl = secret.otpauth_url!;
  const qrImageUrl = await qrcode.toDataURL(otpauthUrl);

  res.status(200).json({
    success: true,
    message: getMessage(req.locale, "MFA başlatıldı.", "MFA başlatıldı.", "MFA initialized."),
    otpauthUrl,
    qrImageUrl, // Frontend'de göster
    mfaEnabled: false,
  });
  return 
});

/**
 * Kullanıcının MFA kodunu doğrular ve MFA'yı etkinleştirir.
 */
export const verifyMfa = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code) {
     res.status(400).json({ success: false, message: getMessage(req.locale, "Kod gereklidir.", "Kod gereklidir.", "Code is required.") });
     return
  }
  const user = await User.findById(req.user!.id).select("+mfaSecret");
  if (!user || !user.mfaSecret) {
     res.status(404).json({ success: false, message: getMessage(req.locale, "MFA ayarlı değil.", "MFA ayarlı değil.", "MFA not set.") });
     return
  }

  const verified = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: "base32",
    token: code,
    window: 2,
  });

  if (!verified) {
    res.status(400).json({ success: false, message: getMessage(req.locale, "Kod hatalı.", "Kod hatalı.", "Invalid code.") });
    return 
  }

  user.mfaEnabled = true;
  await user.save();

  res.status(200).json({
    success: true,
    message: getMessage(req.locale, "MFA başarıyla etkinleştirildi.", "MFA başarıyla etkinleştirildi.", "MFA enabled successfully."),
    mfaEnabled: true,
  });
  return
});
