import express from "express";
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

import {
  updateUserRole,
  toggleUserStatus,
} from "./status.controller";

import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import upload from "@/core/middleware/uploadMiddleware";
import { validateApiKey } from "@/core/middleware/validateApiKey";

const router = express.Router();

// 🔐 Auth
router.post("/register", registerUser);
router.post("/login", validateApiKey,loginUser);
router.post("/change-password", authenticate, validateApiKey,changePassword);
router.post("/forgot-password", validateApiKey,forgotPassword);
router.post("/reset-password/:token", validateApiKey,resetPassword);

// 👤 Profile
router
  .route("/profile")

// 📋 Admin Routes
router.get("/users", authenticate, authorizeRoles("admin"), validateApiKey,getUsers);

router
  .route("/users/:id")
  .get(authenticate, authorizeRoles("admin"), getUserById)
  .put(
    authenticate,
    authorizeRoles("admin"),
    (req, res, next) => {
      req.uploadType = "profile";
      next();
    },
    upload.single("profileImage"),
    updateUser
  )
  .delete(authenticate, authorizeRoles("admin"), validateApiKey,deleteUser);

router.put(
  "/users/:id/role",
  authenticate,
  authorizeRoles("admin"),
  updateUserRole,
  validateApiKey
);

router.put(
  "/users/:id/status",
  authenticate,
  authorizeRoles("admin"),
  validateApiKey,
  toggleUserStatus
);

router.post("/logout", logoutUser);

export default router;
