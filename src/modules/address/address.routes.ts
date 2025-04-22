import express from "express";
import {
  getUserAddresses,
  createAddress,
  getAddressById,
  updateAddress,
  deleteAddress,
} from "../users/address.controller";
import { authenticate } from "../../core/middleware/authMiddleware";

const router = express.Router();

// 🔐 Token doğrulama zorunlu
router.use(authenticate);

// 👤 Tüm adresleri getir (sadece login olmuş kullanıcı)
router.get("/", getUserAddresses);

// ➕ Yeni adres oluştur
router.post("/", createAddress);

// 🔍 Belirli bir adresi getir
router.get("/:id", getAddressById);

// ✏️ Adres güncelle
router.put("/:id", updateAddress);

// ❌ Adres sil
router.delete("/:id", deleteAddress);

export default router;
