import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  registerUser,
  loginUser,
  changePassword,
  logoutUser,
  forgotPassword,
  resetPassword,
} from "./auth.controller";

import {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "./crud.controller";

import { updateUserRole, toggleUserStatus } from "./status.controller";

import { upload } from "@/core/middleware/uploadMiddleware";
import { validateApiKey } from "@/core/middleware/validateApiKey";
import { uploadTypeWrapper } from "@/core/middleware/uploadTypeWrapper";

// ✅ Validations
import {
  validateRegister,
  validateLogin,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword,
  validateUserIdParam,
  validateUpdateUser,
  validateUpdateUserRole,
  validateToggleUserStatus,
} from "./users.admin.validation";

const router = express.Router();

// 🔐 Auth Routes
router.post("/register", validateRegister, registerUser);

router.post("/login", validateLogin, loginUser);

router.post(
  "/change-password",
  authenticate,
  validateChangePassword,
  changePassword
);
router.post("/forgot-password", validateForgotPassword, forgotPassword);

router.post("/reset-password/:token", validateResetPassword, resetPassword);

// 📋 Admin Routes
router.get(
  "/users",
  authenticate,
  authorizeRoles("admin"),
  validateApiKey,
  getUsers
);

router.get(
  "/users/:id",
  authenticate,
  authorizeRoles("admin"),
  validateUserIdParam,
  getUserById
);

router.put(
  "/users/:id",
  authenticate,
  authorizeRoles("admin"),
  validateUserIdParam,
  uploadTypeWrapper("profile"),                     
  upload("profile").single("profileImage"),     
  validateUpdateUser,
  updateUser
);

router.delete(
  "/users/:id",
  authenticate,
  authorizeRoles("admin"),
  validateApiKey,
  validateUserIdParam,
  deleteUser
);

router.put(
  "/users/:id/role",
  authenticate,
  authorizeRoles("admin"),
  validateUpdateUserRole,
  validateApiKey,
  updateUserRole
);

router.put(
  "/users/:id/status",
  authenticate,
  authorizeRoles("admin"),
  validateToggleUserStatus,
  validateApiKey,
  toggleUserStatus
);

// 🔓 Logout (genel)
router.post("/logout", logoutUser);

export default router;
