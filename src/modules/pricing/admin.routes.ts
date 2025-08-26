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

// 🔐 Admin
router.use(authenticate, authorizeRoles("admin", "moderator"));

// List
router.get("/", validateAdminQuery, getAllPricingAdmin);

// Detail
router.get("/:id", validateObjectId("id"), getPricingByIdAdmin);

// Create
router.post(
  "/",
  transformNestedFields(["title","description","ctaLabel","unitName","features","featureItems","tiers"]),
  validateCreatePricing,
  createPricing
);

// Update
router.put(
  "/:id",
  transformNestedFields(["title","description","ctaLabel","unitName","features","featureItems","tiers"]),
  validateObjectId("id"),
  validateUpdatePricing,
  updatePricing
);

// Delete
router.delete("/:id", validateObjectId("id"), deletePricing);

export default router;
