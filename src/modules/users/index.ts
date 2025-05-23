// src/modules/users/index.ts
import express from "express";

// 📦 Routes
import userRoutes from "./users.routes";
import accountRoutes from "./account.routes";

// 👤 Modeller
import  {User } from "./users.models";

// 🛠️ Controller'lar
import * as authController from "./auth.controller";
import * as accountController from "./account.controller";
import * as statusController from "./status.controller";
import * as crudController from "./crud.controller";

// ✅ Validasyonlar
import * as userValidation from "./users.validation";
import * as adminUserValidation from "./users.admin.validation";

const router = express.Router();

// 🔐 Ana kullanıcı rotaları
router.use("/", userRoutes);

// 👤 Hesap yönetimi rotaları (/account ile başlar)
router.use("/account", accountRoutes);


// ✅ Tek noktadan export
export {
  User,
  authController,
  accountController,
  statusController,
  crudController,
  userValidation,
  adminUserValidation,
};

export default router;
