import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import crypto from "crypto";
import axios from "axios";
import { OAuth2Client } from "google-auth-library";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { hashPassword, comparePasswords } from "@/core/middleware/auth/authUtils";
import { generateToken } from "@/core/middleware/auth/token";
import { setTokenCookie, clearTokenCookie } from "@/core/middleware/auth/cookie";
import logger from "@/core/middleware/logger/logger";
import { t as translate } from "@/core/utils/i18n/translate";
import { generateOtpCode } from "@/core/middleware/auth/otp";
import translations from "./i18n";
import type { LiteUserPayload, Role } from "./types";

const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const FACEBOOK_APP_ID =
  process.env.FACEBOOK_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

const DEV_MODE =
  process.env.AUTHLITE_DEV_MODE === "1" || process.env.NODE_ENV !== "production";

const T = (req: Request, key: string, fallback: string) => {
  const v = translate(key, (req as any).locale, translations);
  return !v || v === key ? fallback : v;
};

const hasAnyRole = (req: Request, allowed: Role[]) => {
  const r = ((req as any).user?.role as Role) || "user";
  const rs: Role[] = Array.isArray((req as any).user?.roles) ? (req as any).user.roles : [r];
  return rs.some((x) => allowed.includes(x));
};

function sanitizeUser(u: any): LiteUserPayload {
  const role: Role = (u?.role as Role) || "user";
  const roles: Role[] | undefined = Array.isArray(u?.roles) ? u.roles : undefined;
  return {
    id: (u?._id || u?.id)?.toString(),
    role,
    roles,
    email: u?.email || undefined,
    name: u?.name || undefined,
    isActive: u?.isActive !== false,
  };
}

async function linkIdentity(
  req: Request,
  tenant: string,
  userId: string,
  provider: "local" | "google" | "facebook",
  providerId: string
) {
  const { AuthIdentity } = await getTenantModels(req);
  await AuthIdentity.updateOne(
    { tenant, provider, providerId },
    { $setOnInsert: { tenant, provider, providerId, userId } },
    { upsert: true }
  ).catch(() => void 0);
}

function randomPassword(): string {
  return crypto.randomBytes(16).toString("hex");
}

/* ---------------- Email/Password ---------------- */

export const registerWithEmail = asyncHandler(async (req: Request, res: Response) => {
  const tenant = (req as any).tenant as string;
  const tenantData = (req as any).tenantData;
  const { email, password, name } = req.body || {};

  const { User } = await getTenantModels(req);
  const existing = await User.findOne({ tenant, email: String(email).trim().toLowerCase() });
  if (existing) {
    res.status(409).json({ success: false, message: T(req, "auth.emailExists", "Bu e-posta zaten kayıtlı.") });
    return;
  }

  const hashed = await hashPassword(password);
  const newUser = await User.create({
    tenant,
    email: String(email).trim().toLowerCase(),
    name: name || (email as string).split("@")[0],
    password: hashed,
    role: "user",
    isActive: true,
  });

  await linkIdentity(req, tenant, newUser._id.toString(), "local", String(email).toLowerCase());

  const token = generateToken({ id: newUser._id.toString(), role: newUser.role });
  setTokenCookie(res, token, tenantData);

  logger.info("auth-lite.register", { tenant, email });
  res.status(201).json({ success: true, data: sanitizeUser(newUser) });
});

export const loginWithEmail = asyncHandler(async (req: Request, res: Response) => {
  const tenant = (req as any).tenant as string;
  const tenantData = (req as any).tenantData;
  const { email, password } = req.body || {};

  const { User } = await getTenantModels(req);
  const user = await User.findOne({ tenant, email: String(email).trim().toLowerCase() }).select("+password");
  if (!user || user.isActive === false) {
    res.status(401).json({ success: false, message: T(req, "auth.userNotFoundOrInactive", "Kullanıcı bulunamadı veya pasif.") });
    return;
  }

  const ok = await comparePasswords(password, user.password);
  if (!ok) {
    res.status(401).json({ success: false, message: T(req, "auth.badCredentials", "E-posta veya şifre hatalı.") });
    return;
  }

  await linkIdentity(req, tenant, user._id.toString(), "local", String(email).toLowerCase());

  const token = generateToken({ id: user._id.toString(), role: user.role });
  setTokenCookie(res, token, tenantData);

  logger.info("auth-lite.login", { tenant, email });
  res.status(200).json({ success: true, data: sanitizeUser(user) });
});

/* ---------------- Google ---------------- */
// (içerik aynı, RBAC'e özel değişiklik yok; aşağıdaki DEV peek uçlarında rol kontrolü ekliyoruz)

/* ---------------- Google ---------------- */

export const loginWithGoogle = asyncHandler(async (req: Request, res: Response) => {
  const tenant = (req as any).tenant as string;
  const tenantData = (req as any).tenantData;
  const { idToken } = req.body || {};

  if (!idToken) {
    res.status(400).json({
      success: false,
      message: T(req, "auth.googleMissingToken", "Google kimlik doğrulaması yapılandırılmamış."),
    });
    return;
  }

  const { User, AuthIdentity } = await getTenantModels(req);

  // DEV override: idToken="debug:mail@domain"
  if (DEV_MODE && typeof idToken === "string" && idToken.startsWith("debug:")) {
    const email = idToken.substring(6).toLowerCase().trim();
    const name = email.split("@")[0];
    let user = await User.findOne({ tenant, email });
    if (!user) {
      const hashed = await hashPassword(randomPassword());
      user = await User.create({
        tenant,
        email,
        name,
        password: hashed,
        role: "user",
        isActive: true,
      });
    }
    await linkIdentity(req, tenant, user._id.toString(), "google", `dev:${email}`);

    const token = generateToken({ id: user._id.toString(), role: user.role });
    setTokenCookie(res, token, tenantData);
    res.status(200).json({ success: true, data: sanitizeUser(user) });
    return;
  }

  // Prod: gerçek JWT beklenir
  if (!googleClient || !GOOGLE_CLIENT_ID) {
    res.status(400).json({
      success: false,
      message: T(req, "auth.googleNotConfigured", "Google kimlik doğrulaması yapılandırılmamış."),
    });
    return;
  }
  // ClientID yanlışlıkla gönderildiyse uyar
  if (typeof idToken === "string" && idToken.split(".").length !== 3) {
    res.status(400).json({
      success: false,
      message: T(
        req,
        "auth.googleBadIdToken",
        "Geçersiz idToken. Lütfen gerçek Google ID Token (JWT) gönderin."
      ),
    });
    return;
  }

  const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  const googleId = payload?.sub;
  const email = (payload?.email || "").toLowerCase();
  const name = payload?.name || email?.split("@")[0];

  if (!googleId) {
    res.status(401).json({
      success: false,
      message: T(req, "auth.googleFailed", "Google doğrulaması başarısız."),
    });
    return;
  }

  let identity = await AuthIdentity.findOne({ tenant, provider: "google", providerId: googleId });
  let user: any = null;

  if (identity) {
    user = await User.findOne({ _id: identity.userId, tenant });
  } else if (email) {
    user = await User.findOne({ tenant, email });
    if (!user) {
      const hashed = await hashPassword(randomPassword());
      user = await User.create({
        tenant,
        email,
        name,
        password: hashed,
        role: "user",
        isActive: true,
      });
    }
    await linkIdentity(req, tenant, user._id.toString(), "google", googleId);
  } else {
    const hashed = await hashPassword(randomPassword());
    user = await User.create({ tenant, name, password: hashed, role: "user", isActive: true });
    await linkIdentity(req, tenant, user._id.toString(), "google", googleId);
  }

  if (!user || user.isActive === false) {
    res.status(401).json({ success: false, message: T(req, "auth.userInactive", "Kullanıcı pasif.") });
    return;
  }

  const token = generateToken({ id: user._id.toString(), role: user.role });
  setTokenCookie(res, token, tenantData);

  logger.info("auth-lite.google", { tenant, email, googleId });
  res.status(200).json({ success: true, data: sanitizeUser(user) });
  return;
});

/* ---------------- Facebook ---------------- */

export const loginWithFacebook = asyncHandler(async (req: Request, res: Response) => {
  const tenant = (req as any).tenant as string;
  const tenantData = (req as any).tenantData;
  const { accessToken } = req.body || {};

  if (!accessToken) {
    res.status(400).json({
      success: false,
      message: T(req, "auth.facebookMissingToken", "Facebook kimlik doğrulaması yapılandırılmamış."),
    });
    return;
  }

  const { User, AuthIdentity } = await getTenantModels(req);

  // DEV override: accessToken="debug:mail@domain"
  if (DEV_MODE && typeof accessToken === "string" && accessToken.startsWith("debug:")) {
    const email = accessToken.substring(6).toLowerCase().trim();
    const name = email.split("@")[0];
    let user = await User.findOne({ tenant, email });
    if (!user) {
      const hashed = await hashPassword(randomPassword());
      user = await User.create({
        tenant,
        email,
        name,
        password: hashed,
        role: "user",
        isActive: true,
      });
    }
    await linkIdentity(req, tenant, user._id.toString(), "facebook", `dev:${email}`);

    const token = generateToken({ id: user._id.toString(), role: user.role });
    setTokenCookie(res, token, tenantData);
    res.status(200).json({ success: true, data: sanitizeUser(user) });
    return;
  }

  if (!FACEBOOK_APP_ID) {
    res.status(400).json({
      success: false,
      message: T(req, "auth.facebookNotConfigured", "Facebook kimlik doğrulaması yapılandırılmamış."),
    });
    return;
  }

  const fbRes = await axios
    .get("https://graph.facebook.com/me", {
      params: { fields: "id,name,email", access_token: accessToken },
    })
    .catch(() => null);

  const fb = fbRes?.data;
  const facebookId: string | undefined = fb?.id;
  const email = (fb?.email || "").toLowerCase();
  const name = fb?.name || email?.split("@")[0];

  if (!facebookId) {
    res.status(401).json({
      success: false,
      message: T(req, "auth.facebookFailed", "Facebook doğrulaması başarısız."),
    });
    return;
  }

  let identity = await AuthIdentity.findOne({ tenant, provider: "facebook", providerId: facebookId });
  let user: any = null;

  if (identity) {
    user = await User.findOne({ _id: identity.userId, tenant });
  } else if (email) {
    user = await User.findOne({ tenant, email });
    if (!user) {
      const hashed = await hashPassword(randomPassword());
      user = await User.create({
        tenant,
        email,
        name,
        password: hashed,
        role: "user",
        isActive: true,
      });
    }
    await linkIdentity(req, tenant, user._id.toString(), "facebook", facebookId);
  } else {
    const hashed = await hashPassword(randomPassword());
    user = await User.create({ tenant, name, password: hashed, role: "user", isActive: true });
    await linkIdentity(req, tenant, user._id.toString(), "facebook", facebookId);
  }

  if (!user || user.isActive === false) {
    res.status(401).json({ success: false, message: T(req, "auth.userInactive", "Kullanıcı pasif.") });
    return;
  }

  const token = generateToken({ id: user._id.toString(), role: user.role });
  setTokenCookie(res, token, tenantData);

  logger.info("auth-lite.facebook", { tenant, email, facebookId });
  res.status(200).json({ success: true, data: sanitizeUser(user) });
  return;
});

/* ---------------- Forgot / Reset Password ---------------- */

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const tenant = (req as any).tenant as string;
  const { email } = req.body || {};
  const { User, PasswordReset } = await getTenantModels(req);

  const user = await User.findOne({
    tenant,
    email: String(email).trim().toLowerCase(),
    isActive: true,
  });

  // Güvenlik: aynı yanıt
  if (!user) {
    logger.info("auth-lite.forgot.no-user", { tenant, email });
    res.status(200).json({
      success: true,
      message: T(req, "auth.forgotSent", "Eğer hesabınız varsa e-posta gönderildi."),
    });
    return;
  }

  const code = generateOtpCode(6);
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 dk

  await PasswordReset.create({
    tenant,
    email: String(email).toLowerCase(),
    userId: user._id,
    code,
    token,
    expiresAt,
    ip: req.ip,
    userAgent: req.headers["user-agent"] || "",
  });

  if (DEV_MODE) {
    // sadece dev log
    logger.info("auth-lite.forgot.dev", { tenant, email, code, token, expiresAt });
  }

  res.status(200).json({
    success: true,
    message: T(req, "auth.forgotSent", "Eğer hesabınız varsa e-posta gönderildi."),
  });
  return;
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const tenant = (req as any).tenant as string;
  const tenantData = (req as any).tenantData;
  const { email, code, token, newPassword } = req.body || {};
  const { User, PasswordReset } = await getTenantModels(req);

  const codeStr = typeof code === "string" ? code.trim() : undefined;
  const tokenStr = typeof token === "string" ? token.trim() : undefined;

  const q: any = {
    tenant,
    email: String(email).toLowerCase(),
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  };
  if (codeStr) q.code = codeStr;
  if (tokenStr) q.token = tokenStr;

  const pr = await PasswordReset.findOne(q).sort({ createdAt: -1 });
  if (!pr) {
    res.status(422).json({
      success: false,
      message: T(req, "auth.resetInvalid", "Kod/token geçersiz veya süresi dolmuş."),
    });
    return;
  }

  const user = await User.findOne({
    _id: pr.userId,
    email: pr.email,
    tenant,
    isActive: true,
  });
  if (!user) {
    res.status(422).json({
      success: false,
      message: T(req, "auth.resetInvalid", "Kod/token geçersiz veya süresi dolmuş."),
    });
    return;
  }

  const hashed = await hashPassword(String(newPassword));
  user.password = hashed;
  await user.save();

  pr.usedAt = new Date();
  await pr.save();

  await PasswordReset.updateMany(
    { tenant, email: pr.email, _id: { $ne: pr._id }, usedAt: { $exists: false } },
    { $set: { usedAt: new Date() } }
  );

  const jwt = generateToken({ id: user._id.toString(), role: user.role });
  setTokenCookie(res, jwt, tenantData);

  logger.info("auth-lite.reset.success", { tenant, email });
  res.status(200).json({
    success: true,
    message: T(req, "auth.resetOk", "Şifreniz güncellendi."),
    data: sanitizeUser(user),
  });
  return;
});

/* ---------------- Me & Logout ---------------- */

export const me = asyncHandler(async (req: Request, res: Response) => {
  const u = (req as any).user;
  if (!u) {
    res.status(401).json({ success: false, message: T(req, "auth.required", "Auth gerekli.") });
    return;
  }
  res.status(200).json({ success: true, data: u });
  return;
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const tenantData = (req as any).tenantData;
  clearTokenCookie(res, tenantData);
  res.status(200).json({ success: true, message: T(req, "auth.loggedOut", "Çıkış yapıldı.") });
  return;
});

/* ---------------- Identities (list/link/unlink) ---------------- */

export const listIdentities = asyncHandler(async (req: Request, res: Response) => {
  const u = (req as any).user;
  if (!u) {
    res.status(401).json({ success: false, message: T(req, "auth.required", "Auth gerekli.") });
    return;
  }

  const tenant = (req as any).tenant as string;
  const { AuthIdentity } = await getTenantModels(req);

  const ids = await AuthIdentity.find({ tenant, userId: u.id }).lean();
  const set = new Set(ids.map((i: any) => i.provider));
  res.status(200).json({
    success: true,
    data: { providers: { local: set.has("local"), google: set.has("google"), facebook: set.has("facebook") } }
  });
  return;
});

export const unlinkIdentity = asyncHandler(async (req: Request, res: Response) => {
  const u = (req as any).user;
  if (!u) {
    res.status(401).json({ success: false, message: T(req, "auth.required", "Auth gerekli.") });
    return;
  }

  const tenant = (req as any).tenant as string;
  const provider = String(req.params.provider || "").toLowerCase() as "google" | "facebook" | "local";
  if (!["google", "facebook", "local"].includes(provider)) {
    res.status(400).json({ success: false, message: "Unknown provider." });
    return;
  }
  if (provider === "local") {
    res.status(400).json({ success: false, message: "Local identity cannot be unlinked." });
    return;
  }

  const { AuthIdentity } = await getTenantModels(req);
  const all = await AuthIdentity.find({ tenant, userId: u.id });
  if (all.length <= 1) {
    res.status(400).json({ success: false, message: "Cannot unlink the last remaining identity." });
    return;
  }

  const del = await AuthIdentity.deleteOne({ tenant, userId: u.id, provider });
  if (!del.deletedCount) {
    res.status(404).json({ success: false, message: "Provider not linked." });
    return;
  }

  const left = await AuthIdentity.find({ tenant, userId: u.id }).lean();
  const set = new Set(left.map((i: any) => i.provider));
  res.status(200).json({
    success: true,
    data: { providers: { local: set.has("local"), google: set.has("google"), facebook: set.has("facebook") } }
  });
  return;
});

/* Explicit LINK endpoints (oturum açıkken bağlama) */

export const linkGoogle = asyncHandler(async (req: Request, res: Response) => {
  const u = (req as any).user;
  if (!u) {
    res.status(401).json({ success: false, message: T(req, "auth.required", "Auth gerekli.") });
    return;
  }
  const tenant = (req as any).tenant as string;

  const { idToken } = req.body || {};
  if (!idToken) {
    res.status(400).json({ success: false, message: T(req, "auth.googleMissingToken", "Google kimlik doğrulaması yapılandırılmamış.") });
    return;
  }

  const { AuthIdentity } = await getTenantModels(req);

  // DEV override
  if (DEV_MODE && typeof idToken === "string" && idToken.startsWith("debug:")) {
    const email = idToken.substring(6).toLowerCase().trim();
    const providerId = `dev:${email}`;
    const exists = await AuthIdentity.findOne({ tenant, provider: "google", providerId });
    if (exists && String(exists.userId) !== String(u.id)) {
      res.status(409).json({ success: false, message: "Google account already linked to another user." });
      return;
    }
    await AuthIdentity.updateOne(
      { tenant, provider: "google", providerId },
      { $setOnInsert: { tenant, provider: "google", providerId, userId: u.id } },
      { upsert: true }
    );
  } else {
    if (!googleClient || !GOOGLE_CLIENT_ID) {
      res.status(400).json({ success: false, message: T(req, "auth.googleNotConfigured", "Google kimlik doğrulaması yapılandırılmamış.") });
      return;
    }
    const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const googleId = payload?.sub;
    if (!googleId) {
      res.status(401).json({ success: false, message: T(req, "auth.googleFailed", "Google doğrulaması başarısız.") });
      return;
    }

    const exists = await AuthIdentity.findOne({ tenant, provider: "google", providerId: googleId });
    if (exists && String(exists.userId) !== String(u.id)) {
      res.status(409).json({ success: false, message: "Google account already linked to another user." });
      return;
    }
    await AuthIdentity.updateOne(
      { tenant, provider: "google", providerId: googleId },
      { $setOnInsert: { tenant, provider: "google", providerId: googleId, userId: u.id } },
      { upsert: true }
    );
  }

  const left = await AuthIdentity.find({ tenant, userId: u.id }).lean();
  const set = new Set(left.map((i: any) => i.provider));
  res.status(200).json({
    success: true,
    data: { providers: { local: set.has("local"), google: set.has("google"), facebook: set.has("facebook") } }
  });
  return;
});

export const linkFacebook = asyncHandler(async (req: Request, res: Response) => {
  const u = (req as any).user;
  if (!u) {
    res.status(401).json({ success: false, message: T(req, "auth.required", "Auth gerekli.") });
    return;
  }
  const tenant = (req as any).tenant as string;

  const { accessToken } = req.body || {};
  if (!accessToken) {
    res.status(400).json({ success: false, message: T(req, "auth.facebookMissingToken", "Facebook kimlik doğrulaması yapılandırılmamış.") });
    return;
  }

  const { AuthIdentity } = await getTenantModels(req);

  // DEV override
  if (DEV_MODE && typeof accessToken === "string" && accessToken.startsWith("debug:")) {
    const email = accessToken.substring(6).toLowerCase().trim();
    const providerId = `dev:${email}`;
    const exists = await AuthIdentity.findOne({ tenant, provider: "facebook", providerId });
    if (exists && String(exists.userId) !== String(u.id)) {
      res.status(409).json({ success: false, message: "Facebook account already linked to another user." });
      return;
    }
    await AuthIdentity.updateOne(
      { tenant, provider: "facebook", providerId },
      { $setOnInsert: { tenant, provider: "facebook", providerId, userId: u.id } },
      { upsert: true }
    );
  } else {
    if (!FACEBOOK_APP_ID) {
      res.status(400).json({ success: false, message: T(req, "auth.facebookNotConfigured", "Facebook kimlik doğrulaması yapılandırılmamış.") });
      return;
    }
    const fbRes = await axios.get("https://graph.facebook.com/me", {
      params: { fields: "id", access_token: accessToken },
    }).catch(() => null);
    const facebookId = fbRes?.data?.id as string | undefined;
    if (!facebookId) {
      res.status(401).json({ success: false, message: T(req, "auth.facebookFailed", "Facebook doğrulaması başarısız.") });
      return;
    }

    const exists = await AuthIdentity.findOne({ tenant, provider: "facebook", providerId: facebookId });
    if (exists && String(exists.userId) !== String(u.id)) {
      res.status(409).json({ success: false, message: "Facebook account already linked to another user." });
      return;
    }
    await AuthIdentity.updateOne(
      { tenant, provider: "facebook", providerId: facebookId },
      { $setOnInsert: { tenant, provider: "facebook", providerId: facebookId, userId: u.id } },
      { upsert: true }
    );
  }

  const left = await AuthIdentity.find({ tenant, userId: u.id }).lean();
  const set = new Set(left.map((i: any) => i.provider));
  res.status(200).json({
    success: true,
    data: { providers: { local: set.has("local"), google: set.has("google"), facebook: set.has("facebook") } }
  });
  return;
});

/* ---------------- Profile update (name) ---------------- */

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const u = (req as any).user;
  if (!u) {
    res.status(401).json({ success: false, message: T(req, "auth.required", "Auth gerekli.") });
    return;
  }

  const tenant = (req as any).tenant as string;
  const { name } = req.body || {};
  const safeName = typeof name === "string" ? name.trim().slice(0, 120) : undefined;

  const { User } = await getTenantModels(req);
  const doc = await User.findOne({ _id: u.id, tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: "User not found." });
    return;
  }

  if (safeName !== undefined) doc.name = safeName || doc.name;
  await doc.save();

  res.status(200).json({ success: true, data: sanitizeUser(doc) });
  return;
});

/* ---------------- DEV: reset peek ---------------- */
export const peekResetDev = asyncHandler(async (req: Request, res: Response) => {
  if (!DEV_MODE || !hasAnyRole(req, ["admin", "manager", "support"])) {
    res.status(404).json({ success: false, message: "Not found" });
    return;
  }
  const tenant = (req as any).tenant as string;
  const email = String((req.query.email as string) || "").toLowerCase().trim();
  const { PasswordReset } = await getTenantModels(req);
  const pr = await PasswordReset.findOne({
    tenant,
    email,
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!pr) { res.status(404).json({ success: false, message: "No active reset record" }); return; }

  res.status(200).json({ success: true, data: { code: pr.code, token: pr.token, expiresAt: pr.expiresAt } });
});

/* ---------------- Identities (list/link/unlink) ---------------- */
// (mevcut kontroller aynı; tüm authenticated roller erişebilir)





