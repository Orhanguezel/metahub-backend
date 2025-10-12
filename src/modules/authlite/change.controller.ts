// src/modules/authlite/change.controller.ts
import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import crypto from "crypto";

import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { generateToken } from "@/core/middleware/auth/token";
import { setTokenCookie } from "@/core/middleware/auth/cookie";
import logger from "@/core/middleware/logger/logger";
import { t as translate } from "@/core/utils/i18n/translate";
import { generateOtpCode } from "@/core/middleware/auth/otp";
import translations from "./i18n";

import { comparePasswords, hashPassword } from "@/core/middleware/auth/authUtils";
import { validateEmailFormat } from "@/core/middleware/auth/validation";
import type { LiteUserPayload } from "./types";

/* ---------------- ENV / helpers ---------------- */
const DEV_MODE = process.env.AUTHLITE_DEV_MODE === "1" || process.env.NODE_ENV !== "production";
// ... imports (aynı)

const T = (req: Request, key: string, fallback: string) => {
  const v = translate(key, (req as any).locale, translations);
  return !v || v === key ? fallback : v;
};
const hasAnyRole = (req: Request, allowed: Array<"admin"|"manager"|"support"|"picker"|"viewer"|"user">) => {
  const r = ((req as any).user?.role as any) || "user";
  const rs: any[] = Array.isArray((req as any).user?.roles) ? (req as any).user.roles : [r];
  return rs.some((x) => allowed.includes(x));
};

function sanitizeUser(u: any): LiteUserPayload {
  return {
    id: (u?._id || u?.id)?.toString(),
    role: u?.role || "user",
    email: u?.email || undefined,
    name: u?.name || undefined,
    isActive: u?.isActive !== false,
  };
}

/* ---------------- Change Password ---------------- */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const u = (req as any).user;
  if (!u) {
    res.status(401).json({ success: false, message: T(req, "auth.required", "Auth gerekli.") });
    return;
  }

  const tenant = (req as any).tenant as string;
  const tenantData = (req as any).tenantData;
  const { currentPassword, newPassword } = req.body || {};

  if (typeof currentPassword !== "string" || !currentPassword.trim()) {
    res.status(422).json({ success: false, message: T(req, "auth.passwordRequired", "Şifre zorunlu.") });
    return;
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    res.status(422).json({ success: false, message: T(req, "auth.weakPassword", "Şifre en az 8 karakter olmalı.") });
    return;
  }

  const { User } = await getTenantModels(req);
  const user = await User.findOne({ _id: u.id, tenant }).select("+password");
  if (!user || user.isActive === false) {
    res.status(401).json({ success: false, message: T(req, "auth.userInactive", "Kullanıcı pasif.") });
    return;
  }

  const ok = await comparePasswords(currentPassword, user.password);
  if (!ok) {
    res.status(401).json({ success: false, message: T(req, "auth.badCredentials", "E-posta veya şifre hatalı.") });
    return;
  }
  if (await comparePasswords(newPassword, user.password)) {
    res.status(422).json({ success: false, message: T(req, "auth.samePassword", "Yeni şifre mevcut şifre ile aynı olamaz.") });
    return;
  }

  user.password = await hashPassword(newPassword);
  await user.save();

  const jwt = generateToken({ id: user._id.toString(), role: user.role });
  setTokenCookie(res, jwt, tenantData);

  logger.info("auth-lite.change-password", { tenant, userId: u.id });
  res.status(200).json({
    success: true,
    message: T(req, "auth.passwordChanged", "Şifreniz güncellendi."),
    data: sanitizeUser(user),
  });
  return;
});

/* ---------------- Change Email (start) ---------------- */
export const changeEmailStart = asyncHandler(async (req: Request, res: Response) => {
  const u = (req as any).user;
  if (!u) {
    res.status(401).json({ success: false, message: T(req, "auth.required", "Auth gerekli.") });
    return;
  }

  const tenant = (req as any).tenant as string;
  const { currentPassword, newEmail } = req.body || {};
  const nextEmail = String(newEmail || "").trim().toLowerCase();

  if (!validateEmailFormat(nextEmail)) {
    res.status(422).json({ success: false, message: T(req, "auth.invalidEmail", "Geçersiz e-posta.") });
    return;
  }

  const { User, EmailChange } = await getTenantModels(req);
  const me = await User.findOne({ _id: u.id, tenant }).select("+password");
  if (!me || me.isActive === false) {
    res.status(401).json({ success: false, message: T(req, "auth.userInactive", "Kullanıcı pasif.") });
    return;
  }

  if (me.email?.toLowerCase() === nextEmail) {
    res.status(422).json({ success: false, message: T(req, "auth.sameEmail", "Yeni e-posta mevcut e-posta ile aynı olamaz.") });
    return;
  }

  const ok = await comparePasswords(String(currentPassword || ""), me.password);
  if (!ok) {
    res.status(401).json({ success: false, message: T(req, "auth.badCredentials", "E-posta veya şifre hatalı.") });
    return;
  }

  const exists = await User.findOne({ tenant, email: nextEmail });
  if (exists) {
    res.status(409).json({ success: false, message: T(req, "auth.emailExists", "Bu e-posta zaten kayıtlı.") });
    return;
  }

  const code = generateOtpCode(6);
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 dk

  await EmailChange.create({
    tenant,
    userId: me._id,
    oldEmail: (me.email || "").toLowerCase(),
    newEmail: nextEmail,
    code,
    token,
    expiresAt,
    ip: req.ip,
    userAgent: req.headers["user-agent"] || "",
  });

  if (DEV_MODE) {
    logger.info("auth-lite.change-email.dev", {
      tenant,
      userId: me._id.toString(),
      oldEmail: me.email,
      newEmail: nextEmail,
      code,
      token,
      expiresAt,
    });
  }

  res.status(200).json({
    success: true,
    message: T(req, "auth.emailChangeStarted", "Doğrulama kodu yeni e-postaya gönderildi."),
  });
  return;
});

/* ---------------- Change Email (confirm) ---------------- */
export const changeEmailConfirm = asyncHandler(async (req: Request, res: Response) => {
  const u = (req as any).user;
  if (!u) {
    res.status(401).json({ success: false, message: T(req, "auth.required", "Auth gerekli.") });
    return;
  }

  const tenant = (req as any).tenant as string;
  const tenantData = (req as any).tenantData;
  const { newEmail, code, token } = req.body || {};
  const nextEmail = String(newEmail || "").trim().toLowerCase();
  const codeStr = typeof code === "string" ? code.trim() : "";
  const tokenStr = typeof token === "string" ? token.trim() : "";

  if (!validateEmailFormat(nextEmail)) {
    res.status(422).json({ success: false, message: T(req, "auth.invalidEmail", "Geçersiz e-posta.") });
    return;
  }
  if (!codeStr && !tokenStr) {
    res.status(422).json({ success: false, message: T(req, "auth.codeOrTokenRequired", "Kod veya token zorunludur.") });
    return;
  }

  const { User, AuthIdentity, EmailChange } = await getTenantModels(req);
  const rec = await EmailChange.findOne({
    tenant,
    newEmail: nextEmail,
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
    ...(codeStr ? { code: codeStr } : {}),
    ...(tokenStr ? { token: tokenStr } : {}),
  }).sort({ createdAt: -1 });

  if (!rec || String(rec.userId) !== String(u.id)) {
    res.status(422).json({ success: false, message: T(req, "auth.resetInvalid", "Kod/token geçersiz veya süresi dolmuş.") });
    return;
  }

  const user = await User.findOne({ _id: rec.userId, tenant, isActive: true });
  if (!user) {
    res.status(404).json({ success: false, message: "User not found." });
    return;
  }

  // Çakışma kontrolü
  const exists = await User.findOne({ tenant, email: nextEmail, _id: { $ne: user._id } });
  if (exists) {
    res.status(409).json({ success: false, message: T(req, "auth.emailExists", "Bu e-posta zaten kayıtlı.") });
    return;
  }

  // Local identity providerId güncelle
  const otherLocal = await AuthIdentity.findOne({ tenant, provider: "local", providerId: nextEmail });
  if (otherLocal && String(otherLocal.userId) !== String(user._id)) {
    res.status(409).json({ success: false, message: "Email already linked to another account." });
    return;
  }
  await AuthIdentity.updateOne(
    { tenant, userId: user._id, provider: "local" },
    { $set: { providerId: nextEmail } },
    { upsert: true }
  ).catch(() => void 0);

  user.email = nextEmail;
  await user.save();

  rec.usedAt = new Date();
  await rec.save();

  await EmailChange.updateMany(
    { tenant, userId: user._id, _id: { $ne: rec._id }, usedAt: { $exists: false } },
    { $set: { usedAt: new Date() } }
  );

  // Oturum yenile
  const jwt = generateToken({ id: user._id.toString(), role: user.role });
  setTokenCookie(res, jwt, tenantData);

  logger.info("auth-lite.change-email.confirm", { tenant, userId: user._id.toString(), newEmail: nextEmail });
  res.status(200).json({
    success: true,
    message: T(req, "auth.emailChanged", "E-postanız güncellendi."),
    data: sanitizeUser(user),
  });
  return;
});





// ... changePassword / changeEmailStart / changeEmailConfirm (aynı içerik)

export const peekEmailChangeDev = asyncHandler(async (req: Request, res: Response) => {
  if (!DEV_MODE || !hasAnyRole(req, ["admin", "manager", "support"])) {
    res.status(404).json({ success: false, message: "Not found" });
    return;
  }
  const tenant = (req as any).tenant as string;
  const newEmail = String((req.query.newEmail as string) || "").toLowerCase().trim();
  const { EmailChange } = await getTenantModels(req);
  const ec = await EmailChange.findOne({
    tenant,
    newEmail,
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 }).lean();

  if (!ec) { res.status(404).json({ success: false, message: "No active email change record" }); return; }

  res.status(200).json({ success: true, data: { code: ec.code, token: ec.token, expiresAt: ec.expiresAt } });
});

