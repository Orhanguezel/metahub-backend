import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  getAllPricingPlanAdmin,
  getPricingPlanByIdAdmin,
  createPricingPlan,
  updatePricingPlan,
  deletePricingPlan,
} from "./admin.controller";
import {
  validateObjectId,
  validateCreatePricingPlan,
  validateUpdatePricingPlan,
  validateAdminQuery,
} from "./validation";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// 🔐 Admin
router.use(authenticate, authorizeRoles("admin", "moderator"));

// List
router.get("/", validateAdminQuery, getAllPricingPlanAdmin);

// Detail
router.get("/:id", validateObjectId("id"), getPricingPlanByIdAdmin);

// Create
router.post(
  "/",
  transformNestedFields(["title", "description", "ctaLabel", "unitName", "features", "featureItems", "tiers"]),
  validateCreatePricingPlan,
  createPricingPlan
);

// Update
router.put(
  "/:id",
  transformNestedFields(["title", "description", "ctaLabel", "unitName", "features", "featureItems", "tiers"]),
  validateObjectId("id"),
  validateUpdatePricingPlan,
  updatePricingPlan
);

// Delete
router.delete("/:id", validateObjectId("id"), deletePricingPlan);

export default router;
