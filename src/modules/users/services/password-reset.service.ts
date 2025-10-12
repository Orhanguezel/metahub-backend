import type { Request } from "express";
import crypto from "crypto";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { generateOtpCode } from "@/core/middleware/auth/otp";
import { hashPassword } from "@/core/middleware/auth/authUtils";
import logger from "@/core/middleware/logger/logger";

type ResetArgs = {
  email: string;
  code?: string;
  token?: string;
  newPassword: string;
};

type DevPeekResult = { code: string; token: string; expiresAt: Date } | null;

function getDevMode(req: Request): boolean {
  const td = (req as any).tenantData || {};
  return Boolean(td?.settings?.authLiteDevMode) ||
         Boolean(td?.debug?.authDev) ||
         process.env.AUTHLITE_DEV_MODE === "1" ||
         process.env.NODE_ENV !== "production";
}

/**
 * Şifre sıfırlama talebi oluşturur.
 * Güvenlik gereği kullanıcı var/yok aynı davranır.
 * DEV modda, test kolaylığı için { code, token, expiresAt } döner; prod’da undefined döner.
 */
export async function requestPasswordReset(
  req: Request,
  emailRaw: string
): Promise<DevPeekResult | void> {
  const tenant = (req as any).tenant as string;
  const email = String(emailRaw || "").trim().toLowerCase();
  const { User, PasswordReset } = await getTenantModels(req);

  const user = await User.findOne({ tenant, email, isActive: true });

  // Güvenlik: her durumda aynı yanıt akışı; user yoksa logla ve çık
  if (!user) {
    logger.info("auth-lite.forgot.no-user", { tenant, email });
    return;
  }

  const code = generateOtpCode(6);
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 dk

  await PasswordReset.create({
    tenant,
    email,
    userId: user._id,
    code,
    token,
    expiresAt,
    ip: (req as any).ip ?? req.ip,
    userAgent: req.headers["user-agent"] || "",
  });

  if (getDevMode(req)) {
    // DEV mod: Postman/e2e için görünür geri dönüş
    logger.info("auth-lite.forgot.dev", { tenant, email, code, token, expiresAt });
    return { code, token, expiresAt };
  }
}

/**
 * Kod veya token ile şifre sıfırlar.
 * Geçerli bir aktif kayıt bulunamazsa 422 fırlatır.
 * Başarıda user döner.
 */
export async function resetPasswordWithCodeOrToken(
  req: Request,
  args: ResetArgs
) {
  const tenant = (req as any).tenant as string;
  const { User, PasswordReset } = await getTenantModels(req);

  const email = String(args.email || "").trim().toLowerCase();
  const codeStr = typeof args.code === "string" ? args.code.trim() : undefined;
  const tokenStr = typeof args.token === "string" ? args.token.trim() : undefined;
  const newPassword = String(args.newPassword || "");

  if (!email) {
    const err: any = new Error("Email is required");
    err.status = 422;
    throw err;
  }
  if (!codeStr && !tokenStr) {
    const err: any = new Error("Code or token is required");
    err.status = 422;
    throw err;
  }
  if (newPassword.length < 8) {
    const err: any = new Error("New password too short");
    err.status = 422;
    throw err;
  }

  const q: any = {
    tenant,
    email,
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  };
  if (codeStr) q.code = codeStr;
  if (tokenStr) q.token = tokenStr;

  const pr = await PasswordReset.findOne(q).sort({ createdAt: -1 });
  if (!pr) {
    const err: any = new Error("Invalid or expired code/token");
    err.status = 422;
    throw err;
  }

  const user = await User.findOne({
    _id: pr.userId,
    email: pr.email,
    tenant,
    isActive: true,
  });
  if (!user) {
    const err: any = new Error("Invalid or expired code/token");
    err.status = 422;
    throw err;
  }

  user.password = await hashPassword(newPassword);
  await user.save();

  // Bu kaydı kullanıldı işaretle
  pr.usedAt = new Date();
  await pr.save();

  // Aynı e-posta için açıkta kalan diğer aktif kayıtları kapat
  await PasswordReset.updateMany(
    { tenant, email: pr.email, _id: { $ne: pr._id }, usedAt: { $exists: false } },
    { $set: { usedAt: new Date() } }
  );

  return user;
}

/**
 * DEV mod için son aktif reset kaydını döndürür; yoksa null.
 * Prod’da çağrılması önerilmez; controller tarafta rol/DEV guard’ı olmalı.
 */
export async function devPeekReset(
  req: Request,
  emailRaw: string
): Promise<DevPeekResult> {
  const tenant = (req as any).tenant as string;
  const email = String(emailRaw || "").toLowerCase().trim();
  const { PasswordReset } = await getTenantModels(req);

  const pr = await PasswordReset.findOne({
    tenant,
    email,
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!pr) return null;
  return { code: pr.code, token: pr.token, expiresAt: pr.expiresAt };
}
