import express from "express";
import {
  getAddresses,             // dinamik (user/company/customer/seller)
  createAddress,
  getAddressById,
  updateAddress,
  deleteAddress,
  updateAllAddresses,       // dinamik (owner paramıyla)
  getUserAddresses,         // sadece kullanıcının kendi adresleri
  updateAllUserAddresses,   // kullanıcının kendi adreslerini topluca değiştir
  getCompanyAddresses,      // şirket adresleri (özel)
  updateAllCompanyAddresses // şirket adreslerini topluca değiştir (özel)
} from "./controller";

import { authenticate } from "@/core/middleware/auth/authMiddleware";
import {
  validateAddress,
  validateUpdateAddresses,
  validateAddressId,
} from "./validation";

const router = express.Router();

/** -- Özel/statik yollar önce -- */
/* User (self) */
router.get("/user", authenticate, getUserAddresses);
router.put("/user/all/replace", authenticate, validateUpdateAddresses, updateAllUserAddresses);

/* Company */
router.get("/company/:companyId", authenticate, getCompanyAddresses);
router.put("/company/:companyId/all/replace", authenticate, validateUpdateAddresses, updateAllCompanyAddresses);

/* Seller (controller dinamik owner okuyor) */
router.get("/seller/:sellerId", authenticate, getAddresses);
router.put("/seller/:sellerId/all/replace", authenticate, validateUpdateAddresses, updateAllAddresses);

/* Customer (isteğe bağlı sabit yol; dinamik controller’ı kullanır) */
// router.get("/customer/:customerId", authenticate, getAddresses);
// router.put("/customer/:customerId/all/replace", authenticate, validateUpdateAddresses, updateAllAddresses);

/* Dinamik toplu replace (owner'ı body/param/query'den alır) */
router.put("/all/replace", authenticate, validateUpdateAddresses, updateAllAddresses);

/** -- Genel yollar en sona -- */
router.get("/", authenticate, getAddresses);
router.post("/", authenticate, validateAddress, createAddress);

router.get("/:id", authenticate, validateAddressId, getAddressById);
router.put("/:id", authenticate, validateAddressId, validateAddress, updateAddress);
router.delete("/:id", authenticate, validateAddressId, deleteAddress);

export default router;
