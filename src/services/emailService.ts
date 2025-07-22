import { Tenants } from "@/modules/tenants/tenants.model";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import emailI18n from "@/services/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { getTenantDbConnection } from "@/core/config/tenantDb";
import { getTenantModelsFromConnection } from "@/core/middleware/tenant/getTenantModelsFromConnection";
import { getTenantMailContext } from "@/core/middleware/tenant/getTenantMailContext";

interface EmailOptions {
  tenantSlug: string; // zorunlu!
  to: string;
  subject: string;
  html: string;
  from?: string;
}

const smtpTransporters: Record<string, { transporter: any; senderName: string; senderEmail: string }> = {};

async function getTenantSmtpTransporter(tenantSlug: string) {
  if (smtpTransporters[tenantSlug]) return smtpTransporters[tenantSlug];

  const tenant = await Tenants.findOne({ slug: tenantSlug, isActive: true }).lean();
  if (!tenant?.emailSettings) throw new Error(`SMTP ayarları bulunamadı! Tenant: ${tenantSlug}`);

  const {
    smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass,
    senderName, senderEmail
  } = tenant.emailSettings;

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });

  smtpTransporters[tenantSlug] = { transporter, senderName, senderEmail };
  return smtpTransporters[tenantSlug];
}

/**
 * Multi-tenant e-posta gönderir
 */
export const sendEmail = async ({
  tenantSlug,
  to,
  subject,
  html,
  from,
}: EmailOptions): Promise<void> => {
  const lang = getLogLocale();

  const { transporter, senderName, senderEmail } = await getTenantSmtpTransporter(tenantSlug);

  const sender =
    from ||
    (senderName && senderEmail
      ? `"${senderName}" <${senderEmail}>`
      : senderEmail);

  const mailOptions = {
    from: sender,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(
      `[${tenantSlug}] ${t("email.sent.success", lang, emailI18n, {
        id: info.messageId,
      })}`
    );
    logger.info(t("email.sent.to", lang, emailI18n, { to }));
  } catch (error: any) {
    logger.error(
      t("email.sent.error", lang, emailI18n, { error: error.message || error })
    );
    throw error;
  }
};

/**
 * Kullanıcıya (multi-tenant, dynamic connection ile) e-posta doğrulama linki gönderir
 */
export const sendEmailVerificationLink = async ({
  tenantSlug,
  userId,
  email,
}: {
  tenantSlug: string;
  userId: string;
  email: string;
}) => {
  const lang = getLogLocale();

  // 1. Token oluştur
  const token = crypto.randomBytes(32).toString("hex");

  // 2. Tenant connection ile User modelini al!
  const conn = await getTenantDbConnection(tenantSlug);
  const { User } = getTenantModelsFromConnection(conn);

  // 3. Tenant'ın domain bilgisini ÇEK — FALLBACK YOK!
  const tenant = await Tenants.findOne({ slug: tenantSlug, isActive: true }).lean();
  const frontendUrl = tenant?.domain?.main;

  if (!frontendUrl) {
    throw new Error(`[EMAIL-VERIFICATION] Tenant domain (main) bulunamadı! Tenant: ${tenantSlug}`);
  }

  // 4. Token'ı user'a yaz
  await User.findByIdAndUpdate(userId, {
    emailVerifyToken: token,
    emailVerifyTokenExpires: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 saat
  });

  // 5. Link oluştur
  const verifyUrl = `${frontendUrl.replace(/\/$/, "")}/verify-email/${token}`;

  // 6. HTML içeriği (i18n)
  const html = `
    <h3>${t("email.verification.heading", lang, emailI18n)}</h3>
    <p>${t("email.verification.body", lang, emailI18n)}</p>
    <a href="${verifyUrl}" target="_blank">${verifyUrl}</a>
    <p>${t("email.verification.ignore", lang, emailI18n)}</p>
  `;

  // 7. E-posta gönder
  await sendEmail({
    tenantSlug,
    to: email,
    subject: t("email.verification.subject", lang, emailI18n),
    html,
  });
};


