// src/modules/users/advanced/auth.advanced.routes.ts

import express from "express";
import * as authAdvancedController from "./auth.advanced.controller";
import {
  validateSendEmailVerification,
  validateVerifyEmail,
  validateSendOtp,
  validateVerifyOtp,
  validateResendOtp,
  validateEnableMfa,
  validateVerifyMfa,
} from "./users.advanced.validation";
import { authenticate } from "@/core/middleware/auth/authMiddleware";

const router = express.Router();

router.post(
  "/send-verification",
  validateSendEmailVerification,
  authAdvancedController.sendEmailVerification
);
router.post(
  "/verify-email",
  validateVerifyEmail,
  authAdvancedController.verifyEmail
);
router.post("/send-otp", validateSendOtp, authAdvancedController.sendOtp);
router.post("/verify-otp", validateVerifyOtp, authAdvancedController.verifyOtp);
router.post("/resend-otp", validateResendOtp, authAdvancedController.resendOtp);
router.post(
  "/enable-mfa",
  authenticate,
  validateEnableMfa,
  authAdvancedController.enableMfa
);
router.post(
  "/verify-mfa",
  authenticate,
  validateVerifyMfa,
  authAdvancedController.verifyMfa
);

export default router;
