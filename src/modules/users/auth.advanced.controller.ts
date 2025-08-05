import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import crypto from "crypto";
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
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// --- Helper: locale ve tenant marka/email ---
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

// --- ANA: Daima HTTPS link döndürür, tenant config yanlışsa bile fixler!
function getTenantMailContext(req: Request) {
  const tenantData = req.tenantData;
  const locale = getLocale(req);
  const brandName =
    (tenantData?.name?.[locale] ||
      tenantData?.name?.en ||
      tenantData?.name) ?? "Brand";
  const brandWebsite =
    tenantData?.domain?.main
      ? `https://${tenantData.domain.main.replace(/^https?:\/\//, "")}`
      : process.env.BRAND_WEBSITE ?? "https://guezelwebdesign.com";
  const senderEmail = tenantData?.emailSettings?.senderEmail;
  // ✳️ Daima https:// ile başlat
  const frontendUrl =
    tenantData?.domain?.main
      ? `https://${tenantData.domain.main.replace(/^https?:\/\//, "")}`
      : process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.replace(/^http:\/\//, "https://")
        : "https://guezelwebdesign.com";
  return { brandName, brandWebsite, senderEmail, frontendUrl };
}

// --- E-posta Doğrulama Gönder
export const sendEmailVerification = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email } = req.body;
  const locale = getLocale(req);
  const { User } = await getTenantModels(req);

  if (!email) {
    logger.withReq.warn(req, `[EMAIL-VERIFICATION] E-posta eksik.`);
    res.status(400).json({
      success: false,
      message: userT("error.emailRequired", locale),
    });
    return;
  }

  const user = await User.findOne({ email, tenant: req.tenant });
  if (!user) {
    logger.withReq.warn(req, `[EMAIL-VERIFICATION] Kullanıcı bulunamadı: ${email}`);
    res.status(404).json({
      success: false,
      message: userT("error.userNotFound", locale),
    });
    return;
  }

  if (user.emailVerified) {
    logger.withReq.info(req, `[EMAIL-VERIFICATION] Zaten doğrulanmış: ${email}`);
    res.status(200).json({
      success: true,
      message: userT("email.alreadyVerified", locale),
    });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  user.emailVerificationToken = token;
  user.emailVerificationExpires = new Date(Date.now() + 1000 * 60 * 60 * 6); // 6 saat
  await user.save();

  const { brandName, brandWebsite, senderEmail, frontendUrl } = getTenantMailContext(req);
  // ⚡️ Sadece HTTPS, asla HTTP yok!
  const verifyUrl = `${frontendUrl.replace(/\/$/, "")}/verify-email/${token}`;

  // Log kontrolü (isteğe bağlı, prod'da kaldır!)
  logger.info(`[EMAIL-VERIFICATION] Gönderilecek link: ${verifyUrl}`);

  await sendEmail({
  tenantSlug: req.tenant,
  to: user.email,
  subject: userT("email.verification.subject", locale, { brand: brandName }),
  html: `
    <h2>${userT("email.verification.subject", locale, { brand: brandName })}</h2>
    <p>${userT("email.verification.body", locale, { brand: brandName })}</p>
    <a href="${verifyUrl}" target="_blank" style="font-size:18px;color:#155be8;">
      ${userT("email.verification.button", locale, { brand: brandName }) || verifyUrl}
    </a>
    <br><br>
    <p style="margin:16px 0 4px 0;font-size:13px;color:#666;">
      ${userT("email.verification.copyPaste", locale, { link: verifyUrl })}
    </p>
    <div style="background:#f8f9fa;border:1px dashed #bbb;padding:8px 14px;margin-bottom:14px;word-break:break-all;">
      ${verifyUrl}
    </div>
    <p style="font-size:12px;color:#888;">${brandName} | ${senderEmail}</p>
    <p style="font-size:12px;color:#888;">${brandWebsite}</p>
  `,
  from: senderEmail,
});



  logger.withReq.info(req, `[EMAIL-VERIFICATION] E-posta gönderildi: ${email}`);
  res.status(200).json({
    success: true,
    message: userT("email.verification.sent", locale),
  });
};

// ✅ E-posta doğrula
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  const locale = getLocale(req);
  const { User } = await getTenantModels(req);

  if (!token) {
    logger.withReq.warn(req, `[EMAIL-VERIFY] Token eksik.`);
    res
      .status(400)
      .json({ success: false, message: userT("error.tokenRequired", locale) });
    return;
  }

  const user = await User.findOne({
    tenant: req.tenant,
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() },
  });

  if (!user) {
    logger.withReq.warn(
      req,
      `[EMAIL-VERIFY] Geçersiz veya süresi dolmuş token.`
    );
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

  logger.withReq.info(
    req,
    `[EMAIL-VERIFY] Doğrulama tamamlandı: ${user.email}`
  );
  res.status(200).json({
    success: true,
    message: userT("email.verification.success", locale),
  });
});

// --- OTP (EMAIL/SMS) ---

export const sendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, via = "email" } = req.body;
  const locale = getLocale(req);
  const { User } = await getTenantModels(req);

  if (!email) {
    logger.withReq.warn(req, `[OTP] E-posta eksik.`);
    res
      .status(400)
      .json({ success: false, message: userT("error.emailRequired", locale) });
    return;
  }
  const user = await User.findOne({ email, tenant: req.tenant });
  if (!user) {
    logger.withReq.warn(req, `[OTP] Kullanıcı bulunamadı: ${email}`);
    res
      .status(404)
      .json({ success: false, message: userT("error.userNotFound", locale) });
    return;
  }

  const otpCode = generateOtpCode(6);
  user.otpCode = otpCode;
  user.otpExpires = new Date(Date.now() + 1000 * 60 * 10);
  await user.save();

  const { brandName, brandWebsite, senderEmail } = getTenantMailContext(req);

  if (via === "sms" && user.phone) {
    await sendSms(user.phone, `${otpCode} - ${userT("otp.smsBody", locale, { brand: brandName })}`);
    logger.withReq.info(req, `[OTP] SMS ile kod gönderildi: ${user.phone}`);
  } else {
    await sendEmail({
      tenantSlug: req.tenant,
      to: user.email,
      subject: userT("otp.emailSubject", locale, { brand: brandName }),
      html: `
        <h2>${otpCode}</h2>
        <p>${userT("otp.emailBody", locale, { brand: brandName })}</p>
        <p style="font-size:12px;color:#888;">${brandName} | ${senderEmail}</p>
        <p style="font-size:12px;color:#888;">${brandWebsite}</p>
      `,
      from: senderEmail,
    });
    logger.withReq.info(req, `[OTP] E-posta ile kod gönderildi: ${user.email}`);
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
  const { User } = await getTenantModels(req);

  if (!email || !code) {
    logger.withReq.warn(req, `[OTP-VERIFY] Email veya kod eksik.`);
    res.status(400).json({
      success: false,
      message: userT("error.emailAndCodeRequired", locale),
    });
    return;
  }
  const user = await User.findOne({
    email,
    tenant: req.tenant,
    otpCode: code,
    otpExpires: { $gt: new Date() },
  });
  if (!user) {
    logger.withReq.warn(req, `[OTP-VERIFY] Kod geçersiz veya süresi dolmuş.`);
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

  logger.withReq.info(req, `[OTP-VERIFY] Başarıyla doğrulandı: ${email}`);
  res
    .status(200)
    .json({ success: true, message: userT("otp.verified", locale) });
});

export const resendOtp = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    logger.withReq.info(req, `[OTP-RESEND] Tekrar gönderiliyor...`);
    return sendOtp(req, res, next);
  }
);

// --- MFA (Google Authenticator - TOTP) ---

export const enableMfa = asyncHandler(async (req: Request, res: Response) => {
  const { User } = await getTenantModels(req);
  const user = await User.findOne({ _id: req.user!.id, tenant: req.tenant });
  const locale = getLocale(req);
  if (!user) {
    logger.withReq.warn(
      req,
      `[MFA-ENABLE] Kullanıcı bulunamadı: ${req.user!.id}`
    );
    res
      .status(404)
      .json({ success: false, message: userT("error.userNotFound", locale) });
    return;
  }

  const { brandName } = getTenantMailContext(req);

  const secret = speakeasy.generateSecret({
    name: `${brandName} (${user.email})`,
    length: 32,
  });

  user.mfaSecret = secret.base32;
  user.mfaEnabled = false;
  await user.save();

  const otpauthUrl = secret.otpauth_url!;
  const qrImageUrl = await qrcode.toDataURL(otpauthUrl);

  logger.withReq.info(req, `[MFA-ENABLE] MFA başlatıldı: ${user.email}`);

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
  const { User } = await getTenantModels(req);

  if (!code) {
    logger.withReq.warn(req, `[MFA-VERIFY] Kod eksik.`);
    res
      .status(400)
      .json({ success: false, message: userT("error.codeRequired", locale) });
    return;
  }
  const user = await User.findOne({
    _id: req.user!.id,
    tenant: req.tenant,
  }).select("+mfaSecret");
  if (!user || !user.mfaSecret) {
    logger.withReq.warn(req, `[MFA-VERIFY] MFA tanımlı değil: ${req.user!.id}`);
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
    logger.withReq.warn(req, `[MFA-VERIFY] Kod geçersiz: ${user.email}`);
    res
      .status(400)
      .json({ success: false, message: userT("error.invalidCode", locale) });
    return;
  }

  user.mfaEnabled = true;
  await user.save();

  logger.withReq.info(req, `[MFA-VERIFY] MFA etkinleştirildi: ${user.email}`);

  res.status(200).json({
    success: true,
    message: userT("mfa.enabled", locale),
    mfaEnabled: true,
  });
});
