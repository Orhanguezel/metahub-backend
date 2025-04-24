import express from "express";
import userRoutes from "./users.routes";
import accountRoutes from "./account.routes";

const router = express.Router();

// 🔐 Ana kullanıcı rotaları
router.use("/", userRoutes);

// 👤 Hesap yönetimi rotaları (/account ile başlar)
router.use("/account", accountRoutes);

// 🔄 Controller dosyalarının dışa aktarımı
export * from "./auth.controller";
export * from "./account.controller";
export * from "./address.controller";
export * from "./status.controller";

// ✅ Model export'u
export { default as User } from "./users.models";

export default router;
