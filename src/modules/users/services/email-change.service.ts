// src/modules/users/services/email-change.service.ts
import type { Request } from "express";
import crypto from "crypto";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { comparePasswords } from "@/core/middleware/auth/authUtils";
import { generateOtpCode } from "@/core/middleware/auth/otp";
import { validateEmailFormat } from "@/core/middleware/auth/validation";
import { setLocalEmailIdentity } from "./identity.service";

function getDevMode(req: Request) {
  const td = (req as any).tenantData || {};
  return Boolean(td?.settings?.authLiteDevMode) || Boolean(td?.debug?.authDev);
}

export async function startEmailChange(
  req: Request,
  currentUserId: string,
  currentPassword: string,
  newEmail: string
) {
  const tenant = (req as any).tenant as string;
  const { User, EmailChange } = await getTenantModels(req);

  const nextEmail = String(newEmail || "").trim().toLowerCase();
  if (!validateEmailFormat(nextEmail)) {
    const err: any = new Error("Invalid email");
    err.status = 422;
    throw err;
  }

  const me = await User.findOne({ _id: currentUserId, tenant }).select("+password");
  if (!me || me.isActive === false) {
    const err: any = new Error("User inactive");
    err.status = 401;
    throw err;
  }

  if ((me.email || "").toLowerCase() === nextEmail) {
    const err: any = new Error("Same email");
    err.status = 422;
    throw err;
  }

  const ok = await comparePasswords(String(currentPassword || ""), me.password);
  if (!ok) {
    const err: any = new Error("Bad credentials");
    err.status = 401;
    throw err;
  }

  const exists = await User.findOne({ tenant, email: nextEmail });
  if (exists) {
    const err: any = new Error("Email exists");
    err.status = 409;
    throw err;
  }

  const code = generateOtpCode(6);
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await EmailChange.create({
    tenant,
    userId: me._id,
    oldEmail: (me.email || "").toLowerCase(),
    newEmail: nextEmail,
    code,
    token,
    expiresAt,
    ip: (req as any).ip,
    userAgent: req.headers["user-agent"] || "",
  });

  return getDevMode(req) ? { code, token, expiresAt } : null;
}

export async function confirmEmailChange(
  req: Request,
  currentUserId: string,
  newEmail: string,
  opts: { code?: string; token?: string }
) {
  const tenant = (req as any).tenant as string;
  const { User, EmailChange } = await getTenantModels(req);

  const nextEmail = String(newEmail || "").trim().toLowerCase();
  const codeStr = typeof opts.code === "string" ? opts.code.trim() : "";
  const tokenStr = typeof opts.token === "string" ? opts.token.trim() : "";

  if (!validateEmailFormat(nextEmail)) {
    const err: any = new Error("Invalid email");
    err.status = 422;
    throw err;
  }
  if (!codeStr && !tokenStr) {
    const err: any = new Error("Code or token required");
    err.status = 422;
    throw err;
  }

  const rec = await EmailChange.findOne({
    tenant,
    newEmail: nextEmail,
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
    ...(codeStr ? { code: codeStr } : {}),
    ...(tokenStr ? { token: tokenStr } : {}),
  }).sort({ createdAt: -1 });

  if (!rec || String(rec.userId) !== String(currentUserId)) {
    const err: any = new Error("Invalid or expired code/token");
    err.status = 422;
    throw err;
  }

  const user = await User.findOne({ _id: rec.userId, tenant, isActive: true });
  if (!user) {
    const err: any = new Error("User not found");
    err.status = 404;
    throw err;
  }

  // Çakışma ve local identity güncelle
  const exists = await User.findOne({ tenant, email: nextEmail, _id: { $ne: user._id } });
  if (exists) {
    const err: any = new Error("Email exists");
    err.status = 409;
    throw err;
  }

  await setLocalEmailIdentity(req, { userId: user._id.toString(), newEmail: nextEmail });

  user.email = nextEmail;
  await user.save();

  rec.usedAt = new Date();
  await rec.save();

  await EmailChange.updateMany(
    { tenant, userId: user._id, _id: { $ne: rec._id }, usedAt: { $exists: false } },
    { $set: { usedAt: new Date() } }
  );

  return user;
}

export async function devPeekEmailChange(req: Request, newEmail: string) {
  const tenant = (req as any).tenant as string;
  if (!getDevMode(req)) return null;

  const { EmailChange } = await getTenantModels(req);
  const ec = await EmailChange.findOne({
    tenant,
    newEmail: String(newEmail || "").toLowerCase().trim(),
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 }).lean();

  if (!ec) return null;
  return { code: ec.code, token: ec.token, expiresAt: ec.expiresAt };
}
