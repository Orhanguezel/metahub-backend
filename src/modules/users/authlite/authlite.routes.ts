import { Router } from "express";
import {
  registerWithEmail,
  loginWithEmail,
  // seller portal:
  registerSellerWithEmail,
  loginSellerWithEmail,
  loginWithGoogle,
  loginWithFacebook,
  me,
  logout,
  forgotPassword,
  resetPassword,
  peekResetDev,
  listIdentities,
  unlinkIdentity,
  linkGoogle,
  linkFacebook,
  updateProfile,
  upgradeToSeller,
} from "./authLite.controller";

import {
  changePassword,
  changeEmailStart,
  changeEmailConfirm,
  peekEmailChangeDev,
} from "./change.controller";
import {
  validateRegisterEmail,
  validateLoginEmail,
  validateGoogle,
  validateFacebook,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
  validateChangeEmailStart,
  validateChangeEmailConfirm,
} from "./authlite.validation";
import { rlForgotPassword, rlResetPassword, rlChangeEmailStart, rlChangeEmailConfirm } from "./rateLimit";
import { authenticate } from "@/core/middleware/auth/authMiddleware";

const router = Router();
const DEV_MODE = process.env.AUTHLITE_DEV_MODE === "1" || process.env.NODE_ENV !== "production";

/* ---------------- Normal kullanıcı (değişmedi) ---------------- */
router.post("/register-email", validateRegisterEmail, registerWithEmail);
router.post("/login-email", validateLoginEmail, loginWithEmail);

/* ---------------- Satıcı portalı (yeni) ---------------- */
router.post("/seller/register-email", validateRegisterEmail, registerSellerWithEmail);
router.post("/seller/login-email", validateLoginEmail, loginSellerWithEmail);

// Auth’lu, tek adımda satıcıya yükseltme:
router.post("/seller/upgrade", authenticate as any, upgradeToSeller);

/* ---------------- Social ---------------- */
router.post("/login-google", validateGoogle, loginWithGoogle);
router.post("/login-facebook", validateFacebook, loginWithFacebook);

/* ---------------- Password reset (rate limited) ---------------- */
router.post("/forgot-password", rlForgotPassword, validateForgotPassword, forgotPassword);
router.post("/reset-password", rlResetPassword, validateResetPassword, resetPassword);

/* ---------------- Session ---------------- */
router.get("/me", authenticate as any, me);
router.post("/logout", logout);

/* ---------------- DEV helper (Postman ile kod/token görme) ---------------- */
if (DEV_MODE) {
  router.get("/__dev/peek-reset", peekResetDev);
}

/* ---------------- Identities ---------------- */
router.get("/identities", authenticate as any, listIdentities);
router.delete("/identities/:provider", authenticate as any, unlinkIdentity);

/* ---------------- Explicit link endpoints (requires session) ---------------- */
router.post("/link-google", authenticate as any, validateGoogle, linkGoogle);
router.post("/link-facebook", authenticate as any, validateFacebook, linkFacebook);

/* ---------------- Profile ---------------- */
router.patch("/profile", authenticate as any, updateProfile);

/* ---------------- Security ---------------- */
router.post("/change-password", authenticate as any, validateChangePassword, changePassword);

/* ---------------- Email change ---------------- */
router.post("/change-email/start", authenticate as any, rlChangeEmailStart, validateChangeEmailStart, changeEmailStart);
router.post("/change-email/confirm", authenticate as any, rlChangeEmailConfirm, validateChangeEmailConfirm, changeEmailConfirm);

/* ---------------- DEV helper ---------------- */
if (DEV_MODE) {
  router.get("/__dev/peek-email-change", peekEmailChangeDev);
}

export default router;
