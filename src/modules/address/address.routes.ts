import express from "express";
import {
  getUserAddresses,
  createAddress,
  getAddressById,
  updateAddress,
  deleteAddress,
  updateAllUserAddresses,
} from "./address.controller";

import { authenticate } from "@/core/middleware/authMiddleware";
import {
  validateAddress,
  validateUpdateAddresses,
} from "./address.validation";

const router = express.Router();

// 🗺️ Tüm adresleri getir
router.get("/", authenticate, getUserAddresses);

// ➕ Yeni adres ekle
router.post("/", authenticate, validateAddress, createAddress);

// 🔎 Tek adres getir
router.get("/:id", authenticate, getAddressById);

// 🛠️ Tek adresi güncelle
router.put("/:id", authenticate, validateAddress, updateAddress);

// 🗑️ Tek adresi sil
router.delete("/:id", authenticate, deleteAddress);

// 🔄 Tüm adresleri topluca güncelle (replace)
router.put("/all/replace", authenticate, validateUpdateAddresses, updateAllUserAddresses);

export default router;
