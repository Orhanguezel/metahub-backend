import express from "express";
import {
  getAddresses,            // dinamik (user veya company)
  createAddress,
  getAddressById,
  updateAddress,
  deleteAddress,
  updateAllAddresses,      // dinamik
  getUserAddresses,        // sadece kullanıcının kendi adresleri
  updateAllUserAddresses,  // sadece kullanıcının kendi adreslerini topluca değiştir
  getCompanyAddresses,     // şirket adresleri
  updateAllCompanyAddresses// şirket adreslerini topluca değiştir
} from "./address.controller";

import { authenticate } from "@/core/middleware/authMiddleware";
import { validateAddress, validateUpdateAddresses } from "./address.validation";

const router = express.Router();

// --- DİNAMİK, OWNER YAKLAŞIMI (eski uyum için) ---
router.get("/", authenticate, getAddresses);
router.post("/", authenticate, validateAddress, createAddress);
router.get("/:id", authenticate, getAddressById);
router.put("/:id", authenticate, validateAddress, updateAddress);
router.delete("/:id", authenticate, deleteAddress);
router.put("/all/replace", authenticate, validateUpdateAddresses, updateAllAddresses);

// --- KULLANICI ADRESLERİ ---
router.get("/user", authenticate, getUserAddresses);
router.put("/user/all/replace", authenticate, validateUpdateAddresses, updateAllUserAddresses);

// --- ŞİRKET ADRESLERİ ---
router.get("/company/:companyId", authenticate, getCompanyAddresses);
router.put("/company/:companyId/all/replace", authenticate, validateUpdateAddresses, updateAllCompanyAddresses);

export default router;
