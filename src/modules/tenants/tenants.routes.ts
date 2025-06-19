import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateCreateTenants,
  validateUpdateTenants,
  validateObjectId,
} from "./tenants.validation";
import {
  createTenant,
  getAllTenants,
  updateTenant,
  deleteTenant,
} from "./tenants.controller";

import { upload } from "@/core/middleware/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

router.use(authenticate, authorizeRoles("admin"));

// ➕ Create Tenant
router.post(
  "/",
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

// 📝 Tüm Tenants
router.get("/", getAllTenants);

// ✏️ Update Tenant
router.put(
  "/:id",
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

// 🗑️ Delete Tenant
router.delete("/:id", validateObjectId("id"), deleteTenant);

export default router;
