import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  getAllPricingAdmin,
  getPricingByIdAdmin,
  createPricing,
  updatePricing,
  deletePricing,
} from "./admin.controller";
import {
  validateObjectId,
  validateCreatePricing,
  validateUpdatePricing,
  validateAdminQuery,
} from "./validation";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// 🌟 Admin Authentication
router.use(authenticate, authorizeRoles("admin", "moderator"));

// 🌟 Admin Endpoints

// Listele (Tüm paketler)
router.get("/", validateAdminQuery, getAllPricingAdmin);

// Tekil paket
router.get("/:id", validateObjectId("id"), getPricingByIdAdmin);

// Yeni paket ekle
router.post(
  "/",
  transformNestedFields(["title", "description"]),
  validateCreatePricing,
  createPricing
);

// Paket güncelle
router.put(
  "/:id",
  transformNestedFields(["title", "description"]),
  validateObjectId("id"),
  validateUpdatePricing,
  updatePricing
);

// Paket sil
router.delete("/:id", validateObjectId("id"), deletePricing);

export default router;
