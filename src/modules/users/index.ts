// src/modules/users/index.ts
import express from "express";
import userRoutes from "./users.routes";                 // admin CRUD + advanced login (klasik)
import accountRoutes from "./account.routes";            // /account (profil, adres vb.)
import authAdvancedRoutes from "./advanced/auth.advanced.routes";
import authliteRoutes from "./authlite/authlite.routes";

const router = express.Router();

// Temel kullanıcı & admin CRUD
router.use("/", userRoutes);

// Hesap/profil uçları
router.use("/account", accountRoutes);

// Doğrulamalı (email verify/MFA vb.) akışlar
router.use("/advanced-auth", authAdvancedRoutes);

// Hızlı giriş (verify’siz, sosyal bağlama + koleksiyon bazlı reset/email-change)
router.use("/authlite", authliteRoutes);

export default router;
