// src/modules/servicecatalog/admin.routes.ts
import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  adminGetAllServiceCatalog,
  adminGetServiceCatalogById,
  createServiceCatalog,
  updateServiceCatalog,
  deleteServiceCatalog,
} from "./admin.controller";

import {
  validateObjectId,
  validateCreateServiceCatalog,
  validateUpdateServiceCatalog,
  validateServiceCatalogAdminQuery,
} from "./validation";

import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// 🌟 Admin Middleware
router.use(authenticate, authorizeRoles("admin", "moderator"));

// 🌟 Admin Endpoints
router.get("/", validateServiceCatalogAdminQuery, adminGetAllServiceCatalog);

router.get("/:id", validateObjectId("id"), adminGetServiceCatalogById);

router.post(
  "/",
  uploadTypeWrapper("servicecatalog"),
  upload("servicecatalog").array("images", 5),
  transformNestedFields(["name", "description", "tags"]),
  validateCreateServiceCatalog,
  createServiceCatalog
);

router.put(
  "/:id",
  uploadTypeWrapper("servicecatalog"),
  upload("servicecatalog").array("images", 5),
  transformNestedFields(["name", "description", "tags"]),
  validateObjectId("id"),
  validateUpdateServiceCatalog,
  updateServiceCatalog
);

router.delete("/:id", validateObjectId("id"), deleteServiceCatalog);

export default router;
