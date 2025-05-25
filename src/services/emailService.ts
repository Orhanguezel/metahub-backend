// services/emailService.ts

import { transporter } from "@/core/config/emailConfig";
import { User } from "@/modules/users/users.models";
import crypto from "crypto";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export const sendEmail = async ({
  to,
  subject,
  html,
  from,
}: EmailOptions): Promise<void> => {
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

    console.log(
      `📧 [${env}] Email sent successfully | Message ID: ${info.messageId}`
    );
    console.log("📨 To:", mailOptions.to);
  } catch (error) {
    console.error("❌ Failed to send email:", error);
  }
};

// YENİ: E-posta doğrulama linki gönderici fonksiyon
export const sendEmailVerificationLink = async ({
  userId,
  email,
  locale = "en",
}: {
  userId: string;
  email: string;
  locale?: string;
}) => {
  // 1. Token oluştur (örneğin random hash)
  const token = crypto.randomBytes(32).toString("hex");

  // 2. Token'ı user modeline kaydet (emailVerifyToken, expires)
  await User.findByIdAndUpdate(userId, {
    emailVerifyToken: token,
    emailVerifyTokenExpires: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 saat
  });

  // 3. Link oluştur
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const verifyUrl = `${frontendUrl}/verify-email/${token}`;

  // 4. HTML içeriği hazırla (basit bir örnek)
  const html = `
    <h3>${locale === "de"
      ? "E-Mail bestätigen"
      : locale === "tr"
      ? "E-postanızı doğrulayın"
      : "Verify your email"}</h3>
    <p>
      ${
        locale === "de"
          ? "Bitte bestätigen Sie Ihre E-Mail-Adresse, indem Sie auf den untenstehenden Link klicken:"
          : locale === "tr"
          ? "Aşağıdaki bağlantıya tıklayarak e-postanızı doğrulayabilirsiniz:"
          : "Please verify your email by clicking the link below:"
      }
    </p>
    <a href="${verifyUrl}" target="_blank">${verifyUrl}</a>
    <p>
      ${
        locale === "de"
          ? "Sollten Sie sich nicht registriert haben, ignorieren Sie diese E-Mail."
          : locale === "tr"
          ? "Eğer bu işlemi siz yapmadıysanız, bu e-postayı dikkate almayınız."
          : "If you did not request this, please ignore this email."
      }
    </p>
  `;

  // 5. E-posta gönder
  await sendEmail({
    to: email,
    subject:
      locale === "de"
        ? "Bestätigen Sie Ihre E-Mail-Adresse"
        : locale === "tr"
        ? "E-posta adresinizi doğrulayın"
        : "Verify your email address",
    html,
  });
};
