// src/modules/users/index.ts
import express from "express";
import userRoutes from "./users.routes";
import accountRoutes from "./account.routes";

import User, { IUser } from "./users.models";
import * as authController from "./auth.controller";
import * as accountController from "./account.controller";
import * as addressController from "./address.controller";
import * as statusController from "./status.controller";

const router = express.Router();

// 🔐 Ana kullanıcı rotaları
router.use("/", userRoutes);

// 👤 Hesap yönetimi rotaları (/account ile başlar)
router.use("/account", accountRoutes);

// ✅ Tek noktadan export
export { User, IUser, authController, accountController, addressController, statusController };
export * from "./users.validation"; // ✅ validasyon dosyası varsa

export default router;
