import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateCreateTenants,
  validateUpdateTenants,
  validateObjectId,
} from "./tenants.validation";
import {
  createTenant,
  getAllTenantsAdmin,
  getAllTenantsPublic,
  updateTenant,
  deleteTenant,
} from "./tenants.controller";

import { upload } from "@/core/middleware/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// --- PUBLIC: sadece aktif ve public tenantlar ---
// Sadece login gerektirmez!
router.get("/", getAllTenantsPublic);

// --- ADMIN: panel işlemleri (TAMAMI admin ve login ister) ---
router.use("/admin", authenticate, authorizeRoles("admin"));

// Admin: Tüm tenants (panelde) 
router.get("/admin", getAllTenantsAdmin);

// Admin: Create Tenant
router.post(
  "/admin",
  uploadTypeWrapper("tenant"),
  upload.array("images", 5),
  transformNestedFields([
    "name",
    "domain",
    "emailSettings",
    "enabledModules",
    "description",
    "metaTitle",
    "metaDescription",
    "address",
    "social",
  ]),
  validateCreateTenants,
  createTenant
);

// Admin: Update Tenant
router.put(
  "/admin/:id",
  uploadTypeWrapper("tenant"),
  upload.array("images", 5),
  transformNestedFields([
    "name",
    "domain",
    "emailSettings",
    "enabledModules",
    "description",
    "metaTitle",
    "metaDescription",
    "address",
    "social",
    "removedImages",
  ]),
  validateObjectId("id"),
  validateUpdateTenants,
  updateTenant
);

// Admin: Delete Tenant
router.delete("/admin/:id", validateObjectId("id"), deleteTenant);

export default router;
