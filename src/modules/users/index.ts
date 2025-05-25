// src/modules/users/index.ts
import express from "express";

// 📦 Routes
import userRoutes from "./users.routes";
import accountRoutes from "./account.routes";
import authAdvancedRoutes from "./auth.advanced.routes";

// 👤 Modeller
import { User } from "./users.models";

// 🛠️ Controller'lar
import * as authController from "./auth.controller";
import * as accountController from "./account.controller";
import * as statusController from "./status.controller";
import * as crudController from "./crud.controller";
import * as authAdvancedController from "./auth.advanced.controller";

// ✅ Validasyonlar
import * as userValidation from "./users.validation";
import * as adminUserValidation from "./users.admin.validation";
import *as authAdvancedValidation from "./users.advanced.validation";

const router = express.Router();

// 🔐 Ana kullanıcı rotaları
router.use("/", userRoutes);

// 👤 Hesap yönetimi rotaları (/account ile başlar)
router.use("/account", accountRoutes);

// 🔐 Gelişmiş kimlik doğrulama rotaları (/advanced-auth ile başlar)
router.use("/advanced-auth", authAdvancedRoutes);

export {
  User,
  authController,
  accountController,
  statusController,
  crudController,
  authAdvancedController,
  userValidation,
  adminUserValidation,
  authAdvancedValidation,
};

export default router;
