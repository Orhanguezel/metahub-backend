// src/services/emailService.ts
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
  tenantSlug: string;
  to: string;
  subject: string;
  currency?: string;
  html: string;
  from?: string;
}

type SmtpTransporter = {
  transporter: ReturnType<typeof nodemailer.createTransport>;
  senderName: string;
  senderEmail: string;
};

// --- In-memory transporter cache ---
const smtpTransporters: Record<string, SmtpTransporter> = {};

// --- SMTP transporter (multi-tenant, cache’li) ---
async function getTenantSmtpTransporter(tenantSlug: string): Promise<SmtpTransporter> {
  if (smtpTransporters[tenantSlug]) return smtpTransporters[tenantSlug];

  const tenant = await Tenants.findOne({ slug: tenantSlug, isActive: true }).lean();
  if (!tenant?.emailSettings) throw new Error(`[SMTP] Ayarlar eksik! Tenant: ${tenantSlug}`);

  const {
    smtpHost,
    smtpPort,
    smtpSecure = true,
    smtpUser,
    smtpPass,
    senderName,
    senderEmail,
  } = tenant.emailSettings;

  if (!smtpHost || !smtpUser || !smtpPass || !senderEmail) {
    throw new Error(`[SMTP] Eksik alan: ${JSON.stringify(tenant.emailSettings)}`);
  }

  // --- Nodemailer instance
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(smtpPort),
    secure: Boolean(smtpSecure),
    auth: { user: smtpUser, pass: smtpPass },
  });

  // Cache
  smtpTransporters[tenantSlug] = { transporter, senderName, senderEmail };
  return smtpTransporters[tenantSlug];
}

// --- Multi-tenant email gönderici ---
export const sendEmail = async ({
  tenantSlug,
  to,
  subject,
  html,
  currency,
  from,
}: EmailOptions): Promise<void> => {
  const lang = getLogLocale();
  const { transporter, senderName, senderEmail } = await getTenantSmtpTransporter(tenantSlug);

  const sender =
    from ||
    (senderName && senderEmail ? `"${senderName}" <${senderEmail}>` : senderEmail);

  const mailOptions = { from: sender, to, subject, html };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`[${tenantSlug}] ${t("email.sent.success", lang, emailI18n, { id: info.messageId })}`);
    logger.info(t("email.sent.to", lang, emailI18n, { to }));
  } catch (error: any) {
    logger.error(t("email.sent.error", lang, emailI18n, { error: error.message || error }));
    throw error;
  }
};

// --- E-mail doğrulama linki gönderen fonksiyon (örnek: signup verify) ---
export const sendEmailVerificationLink = async ({
  tenantSlug,
  userId,
  email,
  currency,
  req,
}: {
  tenantSlug: string;
  userId: string;
  email: string;
  currency?: string;
  req: any;
}) => {
  const lang = getLogLocale();
  const token = crypto.randomBytes(32).toString("hex");
  const conn = await getTenantDbConnection(tenantSlug);
  const { User } = getTenantModelsFromConnection(conn);

  const { brandName, senderEmail, frontendUrl } = getTenantMailContext(req);

  if (!frontendUrl) {
    throw new Error(`[EMAIL-VERIFICATION] Tenant domain bulunamadı: ${tenantSlug}`);
  }

  await User.findByIdAndUpdate(userId, {
    emailVerifyToken: token,
    emailVerifyTokenExpires: new Date(Date.now() + 1000 * 60 * 60 * 24),
  });

  const verifyUrl = `${frontendUrl.replace(/\/$/, "")}/verify-email/${token}`;
  const html = `
    <h3>${t("email.verification.heading", lang, emailI18n)}</h3>
    <p>${t("email.verification.body", lang, emailI18n)}</p>
    <a href="${verifyUrl}" target="_blank">${verifyUrl}</a>
    <p>${t("email.verification.ignore", lang, emailI18n)}</p>
  `;

  await sendEmail({
    tenantSlug,
    to: email,
    subject: t("email.verification.subject", lang, emailI18n),
    html,
    currency,
    from: senderEmail,
  });
};
