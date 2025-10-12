// src/modules/users/authlite/authLite.controller.ts
import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { hashPassword, comparePasswords } from "@/core/middleware/auth/authUtils";
import logger from "@/core/middleware/logger/logger";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "../i18n";
import type { LiteUserPayload, Role } from "../types/authlite.types";

/* services */
import {
  listProviders as listProvidersSvc,
  linkIdentity as linkIdentitySvc,
  unlinkIdentity as unlinkIdentitySvc,
} from "../services/identity.service";
import {
  loginWithGoogleService,
  loginWithFacebookService,
  linkGoogleAccountService,
  linkFacebookAccountService,
} from "../services/social.service";
import {
  requestPasswordReset,
  resetPasswordWithCodeOrToken,
  devPeekReset,
} from "../services/password-reset.service";
import { issueSession, clearSession } from "../services/session.service";
import { updateDisplayName } from "../services/profile.service";

/* seller helper (TEKİL path) */
import {
  ensureSellerRole,
  createSellerForUser,
} from "@/modules/sellers/service/sellerForUser.service";

/* --- i18n helper --- */
const T = (req: Request, key: string, fallback: string) => {
  const v = translate(key, (req as any).locale, translations);
  return !v || v === key ? fallback : v;
};

const hasAnyRole = (req: Request, allowed: Role[]) => {
  const r = ((req as any).user?.role as Role) || "user";
  const rs: Role[] = Array.isArray((req as any).user?.roles) ? (req as any).user.roles : [r];
  return rs.some((x) => allowed.includes(x));
};

/* ---------- aktif rol seçimi ---------- */
function computeActiveRole(u: any, opts?: { forceSellerPortal?: boolean }): Role {
  const base: Role = (u?.role as Role) || "user";
  const roles: Role[] = Array.isArray(u?.roles) ? (u.roles as Role[]) : [base];
  if (opts?.forceSellerPortal && roles.includes("seller")) return "seller";
  return base;
}

function sanitizeUser(u: any, opts?: { forceSellerPortal?: boolean }): LiteUserPayload {
  const active = computeActiveRole(u, opts);
  const roles: Role[] | undefined = Array.isArray(u?.roles) ? (u.roles as Role[]) : undefined;
  return {
    id: (u?._id || u?.id)?.toString(),
    role: active,
    roles,
    email: u?.email || undefined,
    name: u?.name || undefined,
    isActive: u?.isActive !== false,
  };
}

/* ---------- İç implementasyonlar (RequestHandler çağırmıyoruz) ---------- */
async function registerEmailImpl(
  req: Request,
  res: Response,
  opts?: { forceSellerPortal?: boolean; sellerPayload?: { shopName?: string; contactName?: string; phone?: string; notes?: string } }
) {
  const tenant = (req as any).tenant as string;
  const { email, password, name } = req.body || {};
  const { User } = await getTenantModels(req);

  const existing = await User.findOne({ tenant, email: String(email).trim().toLowerCase() });
  if (existing) {
    res.status(409).json({ success: false, message: T(req, "auth.emailExists", "Bu e-posta zaten kayıtlı.") });
    return;
  }

  const hashed = await hashPassword(password);
  const newUser: any = await User.create({
    tenant,
    email: String(email).trim().toLowerCase(),
    name: name || (email as string).split("@")[0],
    password: hashed,
    role: "user",
    isActive: true,
  });

  // Seller portalı ise roller + seller doc
  if (opts?.forceSellerPortal) {
    await ensureSellerRole(req, newUser);
    await createSellerForUser(req, newUser._id.toString(), {
      shopName: opts?.sellerPayload?.shopName,
      contactName: opts?.sellerPayload?.contactName,
      email,
      phone: opts?.sellerPayload?.phone,
      notes: opts?.sellerPayload?.notes,
    });
  }

  await linkIdentitySvc(req, {
    userId: newUser._id.toString(),
    provider: "local",
    providerId: String(email).toLowerCase(),
  });

  const activeRole = computeActiveRole(newUser, { forceSellerPortal: !!opts?.forceSellerPortal });
  issueSession(req, res, { id: newUser._id.toString(), role: activeRole });

  logger.info(opts?.forceSellerPortal ? "auth-lite.seller.register" : "auth-lite.register", { tenant, email });
  res.status(201).json({ success: true, data: sanitizeUser(newUser, { forceSellerPortal: !!opts?.forceSellerPortal }) });
}

async function loginEmailImpl(
  req: Request,
  res: Response,
  opts?: { forceSellerPortal?: boolean }
) {
  const tenant = (req as any).tenant as string;
  const { email, password } = req.body || {};
  const { User } = await getTenantModels(req);

  const user: any = await User.findOne({ tenant, email: String(email).trim().toLowerCase() }).select("+password");
  if (!user || user.isActive === false) {
    res.status(401).json({ success: false, message: T(req, "auth.userNotFoundOrInactive", "Kullanıcı bulunamadı veya pasif.") });
    return;
  }

  const ok = await comparePasswords(password, user.password);
  if (!ok) {
    res.status(401).json({ success: false, message: T(req, "auth.badCredentials", "E-posta veya şifre hatalı.") });
    return;
  }

  // seller portalı login ise: seller rolü yoksa ekleyelim (opsiyonel)
  if (opts?.forceSellerPortal) {
    await ensureSellerRole(req, user);
  }

  await linkIdentitySvc(req, {
    userId: user._id.toString(),
    provider: "local",
    providerId: String(email).toLowerCase(),
  });

  const activeRole = computeActiveRole(user, { forceSellerPortal: !!opts?.forceSellerPortal });
  issueSession(req, res, { id: user._id.toString(), role: activeRole });

  logger.info(opts?.forceSellerPortal ? "auth-lite.seller.login" : "auth-lite.login", { tenant, email });
  res.status(200).json({ success: true, data: sanitizeUser(user, { forceSellerPortal: !!opts?.forceSellerPortal }) });
}

/* ---------------- Email/Password (GENEL) ---------------- */
export const registerWithEmail = asyncHandler(async (req, res) => {
  return registerEmailImpl(req, res);
});

export const loginWithEmail = asyncHandler(async (req, res) => {
  return loginEmailImpl(req, res);
});

export const loginSellerWithEmail = asyncHandler(async (req, res) => {
  return loginEmailImpl(req, res, { forceSellerPortal: true });
});

/* ---------------- Google ---------------- */
export const loginWithGoogle = asyncHandler(async (req, res) => {
  try {
    const { idToken } = req.body || {};
    const user = await loginWithGoogleService(req, String(idToken || ""));
    issueSession(req, res, { id: user._id.toString(), role: computeActiveRole(user) });
    res.status(200).json({ success: true, data: sanitizeUser(user) });
  } catch (e: any) {
    res.status(e.status || 500).json({ success: false, message: T(req, "auth.googleFailed", e.message || "Google doğrulaması başarısız.") });
  }
});

/* ---------------- Facebook ---------------- */
export const loginWithFacebook = asyncHandler(async (req, res) => {
  try {
    const { accessToken } = req.body || {};
    const user = await loginWithFacebookService(req, String(accessToken || ""));
    issueSession(req, res, { id: user._id.toString(), role: computeActiveRole(user) });
    res.status(200).json({ success: true, data: sanitizeUser(user) });
  } catch (e: any) {
    res.status(e.status || 500).json({ success: false, message: T(req, "auth.facebookFailed", e.message || "Facebook doğrulaması başarısız.") });
  }
});

/* ---------------- Forgot / Reset Password ---------------- */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body || {};
  await requestPasswordReset(req, String(email || ""));
  res.status(200).json({
    success: true,
    message: T(req, "auth.forgotSent", "Eğer hesabınız varsa e-posta gönderildi."),
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  try {
    const { email, code, token, newPassword } = req.body || {};
    const user = await resetPasswordWithCodeOrToken(req, {
      email: String(email || ""),
      code: typeof code === "string" ? code : undefined,
      token: typeof token === "string" ? token : undefined,
      newPassword: String(newPassword || ""),
    });
    issueSession(req, res, { id: user._id.toString(), role: computeActiveRole(user) });
    logger.info("auth-lite.reset.success", { tenant: (req as any).tenant, email });
    res.status(200).json({
      success: true,
      message: T(req, "auth.resetOk", "Şifreniz güncellendi."),
      data: sanitizeUser(user),
    });
  } catch (e: any) {
    res.status(e.status || 500).json({ success: false, message: T(req, "auth.resetInvalid", e.message || "Kod/token geçersiz veya süresi dolmuş.") });
  }
});

/* ---------------- Me & Logout ---------------- */
export const me = asyncHandler(async (req, res) => {
  const u = (req as any).user;
  if (!u) {
    res.status(401).json({ success: false, message: T(req, "auth.required", "Auth gerekli.") });
    return;
  }
  // not: burada session’daki role zaten aktif; payload için tekrar hesaplamak istersen computeActiveRole kullanabilirsin
  res.status(200).json({ success: true, data: sanitizeUser(u) });
});

export const logout = asyncHandler(async (req, res) => {
  clearSession(req, res);
  res.status(200).json({ success: true, message: T(req, "auth.loggedOut", "Çıkış yapıldı.") });
});

/* ---------------- Identities (list/link/unlink) ---------------- */
export const listIdentities = asyncHandler(async (req, res) => {
  const u = (req as any).user;
  if (!u) { res.status(401).json({ success: false, message: T(req, "auth.required", "Auth gerekli.") }); return; }
  const providers = await listProvidersSvc(req, u.id);
  res.status(200).json({ success: true, data: { providers } });
});

export const unlinkIdentity = asyncHandler(async (req, res) => {
  const u = (req as any).user;
  if (!u) { res.status(401).json({ success: false, message: T(req, "auth.required", "Auth gerekli.") }); return; }

  const provider = String(req.params.provider || "").toLowerCase();
  if (!["google", "facebook"].includes(provider)) {
    res.status(400).json({ success: false, message: "Unknown provider." });
    return;
  }
  try {
    const providers = await unlinkIdentitySvc(req, { userId: u.id, provider: provider as any });
    res.status(200).json({ success: true, data: { providers } });
  } catch (e: any) {
    res.status(e.status || 500).json({ success: false, message: e.message || "Unlink failed" });
  }
});

/* Explicit LINK endpoints (oturum açıkken bağlama) */
export const linkGoogle = asyncHandler(async (req, res) => {
  const u = (req as any).user;
  if (!u) { res.status(401).json({ success: false, message: T(req, "auth.required", "Auth gerekli.") }); return; }
  const { idToken } = req.body || {};
  try {
    const providers = await linkGoogleAccountService(req, u.id, String(idToken || ""));
    res.status(200).json({ success: true, data: { providers } });
  } catch (e: any) {
    res.status(e.status || 500).json({ success: false, message: e.message || T(req, "auth.googleFailed", "Google doğrulaması başarısız.") });
  }
});

export const linkFacebook = asyncHandler(async (req, res) => {
  const u = (req as any).user;
  if (!u) { res.status(401).json({ success: false, message: T(req, "auth.required", "Auth gerekli.") }); return; }
  const { accessToken } = req.body || {};
  try {
    const providers = await linkFacebookAccountService(req, u.id, String(accessToken || ""));
    res.status(200).json({ success: true, data: { providers } });
  } catch (e: any) {
    res.status(e.status || 500).json({ success: false, message: e.message || T(req, "auth.facebookFailed", "Facebook doğrulaması başarısız.") });
  }
});

/* ---------------- DEV: reset peek ---------------- */
export const peekResetDev = asyncHandler(async (req, res) => {
  if (!hasAnyRole(req, ["admin", "manager", "support"])) {
    res.status(404).json({ success: false, message: "Not found" });
    return;
  }
  const email = String((req.query.email as string) || "").toLowerCase().trim();
  const data = await devPeekReset(req, email);
  if (!data) { res.status(404).json({ success: false, message: "No active reset record" }); return; }
  res.status(200).json({ success: true, data });
});

/* ---------------- Profile (name) ---------------- */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const u = (req as any).user;
  if (!u) {
    res.status(401).json({ success: false, message: T(req, "auth.required", "Auth gerekli.") });
    return;
  }

  const { name } = req.body || {};
  const updated = await updateDisplayName(req, u.id, name);

  if (!updated) {
    res.status(404).json({ success: false, message: "User not found." });
    return;
  }

  // aktif rol seçim mantığına dokunmadan payload’ı geri veriyoruz
  res.status(200).json({ success: true, data: sanitizeUser(updated) });
});



export const registerSellerWithEmail = asyncHandler(async (req, res) => {
  const { email, password, shopName, contactName, phone, notes } = req.body || {};
  const tenant = (req as any).tenant as string;
  const { User } = await getTenantModels(req);

  const lower = String(email || "").trim().toLowerCase();
  if (!lower || !password) {
    res.status(400).json({ success: false, message: "email_and_password_required" });
    return;
  }

  // 1) kullanıcı var mı?
  const user: any = await User.findOne({ tenant, email: lower }).select("+password");
  if (!user) {
    // seller için yeni user yaratmıyoruz → önce user register
    res.status(409).json({ success: false, message: "user_must_register_first" });
    return;
  }

  // 2) şifre doğrula
  const ok = await comparePasswords(password, user.password);
  if (!ok) {
    res.status(401).json({ success: false, message: "bad_credentials" });
    return;
  }

  // 3) seller rolünü ekle + seller doc oluştur (idempotent servis kullandığınızı varsayıyorum)
  await ensureSellerRole(req, user);
  const sellerDoc = await createSellerForUser(req, user._id.toString(), {
    shopName, contactName, email: lower, phone, notes,
  });

  // 4) seller portal için aktif rolü 'seller' seç
  const activeRole = computeActiveRole(user, { forceSellerPortal: true });
  issueSession(req, res, { id: user._id.toString(), role: activeRole });

  res.status(200).json({
    success: true,
    data: sanitizeUser(user, { forceSellerPortal: true }),
    meta: { sellerId: sellerDoc?._id?.toString() },
  });
});

/* --------- Auth’lu upgrade (önerilen yol) --------- */
export const upgradeToSeller = asyncHandler(async (req, res) => {
  const u = (req as any).user;
  if (!u) { res.status(401).json({ success: false, message: "auth_required" }); return; }

  const { shopName, contactName, phone, notes } = req.body || {};

  // roller + seller doc (idempotent)
  await ensureSellerRole(req, u);
  const sellerDoc = await createSellerForUser(req, u.id, {
    shopName, contactName, email: u.email, phone, notes,
  });

  // aktif rolü seller'a zorlayalım
  const activeRole = computeActiveRole(u, { forceSellerPortal: true });
  issueSession(req, res, { id: u.id, role: activeRole });

  res.status(200).json({
    success: true,
    data: sanitizeUser(u, { forceSellerPortal: true }),
    meta: { sellerId: sellerDoc?._id?.toString() },
  });
});



