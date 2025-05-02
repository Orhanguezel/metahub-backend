import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { User } from "@/modules/users";
import crypto from "crypto";
import { passwordResetTemplate } from "@/templates/passwordReset";
import { sendEmail } from "@/services/emailService";
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

// ✅ Register
export const registerUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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

  if (!validateEmailFormat(email)) {
    res.status(400).json({
      success: false,
      message: req.locale === "de"
        ? "Ungültiges E-Mail-Format."
        : req.locale === "tr"
        ? "Geçersiz e-posta formatı."
        : "Invalid email format.",
    });
    return;
  }

  if (!password || password.length < 6) {
    res.status(400).json({
      success: false,
      message: req.locale === "de"
        ? "Passwort ist erforderlich (mindestens 6 Zeichen)."
        : req.locale === "tr"
        ? "Şifre en az 6 karakter olmalıdır."
        : "Password is required (minimum 6 characters).",
    });
    return;
  }

  const normalizedRole = role.toLowerCase();
  if (!isValidRole(normalizedRole)) {
    res.status(400).json({
      success: false,
      message: req.locale === "de"
        ? "Ungültige Benutzerrolle."
        : req.locale === "tr"
        ? "Geçersiz kullanıcı rolü."
        : "Invalid user role.",
    });
    return;
  }

  let parsedAddresses, parsedSocialMedia, parsedNotifications;
  try {
    parsedAddresses = validateJsonField(addresses, "addresses");
    parsedSocialMedia = validateJsonField(socialMedia, "socialMedia");
    parsedNotifications = validateJsonField(notifications, "notifications");
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
    return;
  }

  const profileImage = req.file ? req.file.filename : "profile.png";
  const hashedPassword = await hashNewPassword(password);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: normalizedRole,
    phone,
    addresses: parsedAddresses,
    profileImage,
    bio,
    birthDate,
    socialMedia: parsedSocialMedia,
    notifications: parsedNotifications,
    language: req.locale || "de",
  });

  await loginAndSetToken(res, user.id, user.role);

  res.status(201).json({
    success: true,
    message: req.locale === "de"
      ? "Benutzer erfolgreich registriert."
      : req.locale === "tr"
      ? "Kullanıcı başarıyla kaydedildi."
      : "User registered successfully.",
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
    },
  });
});

// ✅ Login
export const loginUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!validateEmailFormat(email)) {
    res.status(400).json({
      success: false,
      message: req.locale === "de"
        ? "Ungültiges E-Mail-Format."
        : req.locale === "tr"
        ? "Geçersiz e-posta formatı."
        : "Invalid email format.",
    });
    return;
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await checkPassword(password, user.password))) {
    res.status(401).json({
      success: false,
      message: req.locale === "de"
        ? "Ungültige E-Mail oder Passwort."
        : req.locale === "tr"
        ? "Geçersiz e-posta veya şifre."
        : "Invalid email or password.",
    });
    return;
  }

  if (!user.isActive) {
    res.status(403).json({
      success: false,
      message: req.locale === "de"
        ? "Ihr Konto ist deaktiviert."
        : req.locale === "tr"
        ? "Hesabınız devre dışı bırakıldı."
        : "Your account is disabled.",
    });
    return;
  }

  await loginAndSetToken(res, user.id, user.role);

  res.status(200).json({
    success: true,
    message: req.locale === "de"
      ? "Erfolgreich eingeloggt."
      : req.locale === "tr"
      ? "Giriş başarılı."
      : "Login successful.",
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
    },
  });
});

// ✅ Change Password
export const changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user!.id).select("+password");
  if (!user) {
    res.status(404).json({
      success: false,
      message: req.locale === "de"
        ? "Benutzer nicht gefunden."
        : req.locale === "tr"
        ? "Kullanıcı bulunamadı."
        : "User not found.",
    });
    return;
  }

  if (!(await checkPassword(currentPassword, user.password))) {
    res.status(401).json({
      success: false,
      message: req.locale === "de"
        ? "Aktuelles Passwort ist ungültig."
        : req.locale === "tr"
        ? "Geçerli şifre yanlış."
        : "Invalid current password.",
    });
    return;
  }

  if (currentPassword === newPassword) {
    res.status(400).json({
      success: false,
      message: req.locale === "de"
        ? "Neues Passwort darf nicht gleich dem aktuellen sein."
        : req.locale === "tr"
        ? "Yeni şifre mevcut şifre ile aynı olamaz."
        : "New password cannot be the same as the current password.",
    });
    return;
  }

  user.password = await hashNewPassword(newPassword);
  await user.save();

  res.status(200).json({
    success: true,
    message: req.locale === "de"
      ? "Passwort erfolgreich aktualisiert."
      : req.locale === "tr"
      ? "Şifre başarıyla güncellendi."
      : "Password updated successfully.",
  });
});

// ✅ Logout
export const logoutUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  logoutAndClearToken(res);
  res.status(200).json({
    success: true,
    message: req.locale === "de"
      ? "Abmeldung erfolgreich."
      : req.locale === "tr"
      ? "Çıkış başarılı."
      : "Logout successful.",
  });
});

// ✅ Forgot Password
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404).json({
      success: false,
      message: req.locale === "de"
        ? "Benutzer nicht gefunden."
        : req.locale === "tr"
        ? "Kullanıcı bulunamadı."
        : "User not found.",
    });
    return;
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
  await user.save();

  const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  const html = passwordResetTemplate({
    name: user.name,
    resetLink,
    locale: req.locale,
  });

  await sendEmail({
    to: user.email,
    subject: req.locale === "de"
      ? "Passwort zurücksetzen"
      : req.locale === "tr"
      ? "Şifre Sıfırlama Talebi"
      : "Password Reset Request",
    html,
  });

  res.status(200).json({
    success: true,
    message: req.locale === "de"
      ? "Passwort-Zurücksetzungslink wurde an Ihre E-Mail gesendet."
      : req.locale === "tr"
      ? "Şifre sıfırlama bağlantısı e-posta ile gönderildi."
      : "Password reset link has been sent to your email.",
  });
});

// ✅ Reset Password
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) {
    res.status(400).json({
      success: false,
      message: req.locale === "de"
        ? "Token ist ungültig oder abgelaufen."
        : req.locale === "tr"
        ? "Token geçersiz veya süresi dolmuş."
        : "Invalid or expired token.",
    });
    return;
  }

  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({
      success: false,
      message: req.locale === "de"
        ? "Neues Passwort ist erforderlich (mindestens 6 Zeichen)."
        : req.locale === "tr"
        ? "Yeni şifre en az 6 karakter olmalıdır."
        : "New password is required (minimum 6 characters).",
    });
    return;
  }

  user.password = await hashNewPassword(newPassword);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: req.locale === "de"
      ? "Passwort erfolgreich zurückgesetzt."
      : req.locale === "tr"
      ? "Şifre başarıyla sıfırlandı."
      : "Password has been reset successfully.",
  });
});
