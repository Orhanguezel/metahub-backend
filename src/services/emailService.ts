import { transporter } from "@/core/config/emailConfig";
import { User } from "@/modules/users/users.models";
import crypto from "crypto";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import emailI18n from "@/services/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  // locale?: SupportedLocale;  // Artık gereksiz, sadece ortamdan alınacak!
}

export const sendEmail = async ({
  to,
  subject,
  html,
  from,
}: EmailOptions): Promise<void> => {
  const lang = getLogLocale();

  const sender =
    from ||
    (process.env.SMTP_FROM && process.env.SMTP_FROM_NAME
      ? `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`
      : "no-reply@example.com");

  const mailOptions = {
    from: sender,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    const env = process.env.APP_ENV || "default";
    logger.info(
      `[${env}] ${t("email.sent.success", lang, emailI18n, {
        id: info.messageId,
      })}`
    );
    logger.info(t("email.sent.to", lang, emailI18n, { to }));
  } catch (error: any) {
    logger.error(
      t("email.sent.error", lang, emailI18n, { error: error.message || error })
    );
  }
};

// E-posta doğrulama linki gönderici fonksiyon
export const sendEmailVerificationLink = async ({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) => {
  const lang = getLogLocale();

  // 1. Token oluştur
  const token = crypto.randomBytes(32).toString("hex");

  // 2. Token'ı user modeline kaydet
  await User.findByIdAndUpdate(userId, {
    emailVerifyToken: token,
    emailVerifyTokenExpires: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 saat
  });

  // 3. Link oluştur
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const verifyUrl = `${frontendUrl}/verify-email/${token}`;

  // 4. HTML içeriği (tamamen i18n)
  const html = `
    <h3>${t("email.verification.heading", lang, emailI18n)}</h3>
    <p>${t("email.verification.body", lang, emailI18n)}</p>
    <a href="${verifyUrl}" target="_blank">${verifyUrl}</a>
    <p>${t("email.verification.ignore", lang, emailI18n)}</p>
  `;

  // 5. E-posta gönder
  await sendEmail({
    to: email,
    subject: t("email.verification.subject", lang, emailI18n),
    html,
  });
};
