// src/modules/users/authlite/change.controller.ts
import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import logger from "@/core/middleware/logger/logger";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "../i18n";
import type { LiteUserPayload } from "../types/authlite.types";

/* services */
import { issueSession } from "../services/session.service";
import { changePasswordService } from "../services/password-change.service";
import { startEmailChange, confirmEmailChange, devPeekEmailChange } from "../services/email-change.service";

/* --- i18n helper --- */
const T = (req: Request, key: string, fallback: string) => {
  const v = translate(key, (req as any).locale, translations);
  return !v || v === key ? fallback : v;
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
  if (!u) { res.status(401).json({ success: false, message: T(req, "auth.required", "Auth gerekli.") }); return; }

  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== "string" || !currentPassword.trim()) {
    res.status(422).json({ success: false, message: T(req, "auth.passwordRequired", "Şifre zorunlu.") });
    return;
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    res.status(422).json({ success: false, message: T(req, "auth.weakPassword", "Şifre en az 8 karakter olmalı.") });
    return;
  }

  try {
    const user = await changePasswordService(req, u.id, currentPassword, newPassword);
    issueSession(req, res, { id: user._id.toString(), role: user.role });
    logger.info("auth-lite.change-password", { tenant: (req as any).tenant, userId: u.id });
    res.status(200).json({
      success: true,
      message: T(req, "auth.passwordChanged", "Şifreniz güncellendi."),
      data: sanitizeUser(user),
    });
  } catch (e: any) {
    res.status(e.status || 500).json({ success: false, message: e.message || "Password change failed" });
  }
});

/* ---------------- Change Email (start) ---------------- */
export const changeEmailStart = asyncHandler(async (req: Request, res: Response) => {
  const u = (req as any).user;
  if (!u) { res.status(401).json({ success: false, message: T(req, "auth.required", "Auth gerekli.") }); return; }

  const { currentPassword, newEmail } = req.body || {};
  try {
    const devInfo = await startEmailChange(req, u.id, String(currentPassword || ""), String(newEmail || ""));
    if (devInfo) {
      // sadece dev modda yardımcı bilgi dönebilir (log yerine API ile)
      res.status(200).json({
        success: true,
        message: T(req, "auth.emailChangeStarted", "Doğrulama kodu yeni e-postaya gönderildi."),
        __dev: devInfo,
      });
      return;
    }
    res.status(200).json({
      success: true,
      message: T(req, "auth.emailChangeStarted", "Doğrulama kodu yeni e-postaya gönderildi."),
    });
  } catch (e: any) {
    res.status(e.status || 500).json({ success: false, message: e.message || "Email change start failed" });
  }
});

/* ---------------- Change Email (confirm) ---------------- */
export const changeEmailConfirm = asyncHandler(async (req: Request, res: Response) => {
  const u = (req as any).user;
  if (!u) { res.status(401).json({ success: false, message: T(req, "auth.required", "Auth gerekli.") }); return; }

  const { newEmail, code, token } = req.body || {};
  try {
    const user = await confirmEmailChange(req, u.id, String(newEmail || ""), { code, token });
    issueSession(req, res, { id: user._id.toString(), role: user.role }); // oturumu yenile
    logger.info("auth-lite.change-email.confirm", { tenant: (req as any).tenant, userId: user._id.toString(), newEmail });
    res.status(200).json({
      success: true,
      message: T(req, "auth.emailChanged", "E-postanız güncellendi."),
      data: sanitizeUser(user),
    });
  } catch (e: any) {
    const msg =
      e.status === 422
        ? T(req, "auth.resetInvalid", "Kod/token geçersiz veya süresi dolmuş.")
        : e.message || "Email change failed";
    res.status(e.status || 500).json({ success: false, message: msg });
  }
});

/* ---------------- DEV peek ---------------- */
export const peekEmailChangeDev = asyncHandler(async (req: Request, res: Response) => {
  const info = await devPeekEmailChange(req, String(req.query.newEmail || ""));
  if (!info) { res.status(404).json({ success: false, message: "Not found" }); return; }
  res.status(200).json({ success: true, data: info });
});
