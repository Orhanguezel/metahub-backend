// src/modules/product/admin.routes.ts
import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  adminListProducts,
  adminGetProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "./admin.controller";
import {
  validateAdminListQuery,
  validateCreateProduct,
  validateUpdateProduct,
  validateObjectId,
} from "./validation";
import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";
import { normalizeCreateProductFields,normalizeUpdateProductFields } from "./normalizeLegacyFields";

const router = express.Router();

// Sadece admin/moderator (superadmin da geçer)
router.use(authenticate, authorizeRoles("admin", "moderator", "superadmin"));

// LIST
router.get("/", validateAdminListQuery, adminListProducts);

// DETAIL
router.get("/:id", validateObjectId("id"), adminGetProductById);

// CREATE (multipart/form-data destekli)
router.post(
  "/",
  uploadTypeWrapper("product"),
  upload("product").array("images", 10),

  // Legacy alan adlarını normalize et (ör. name -> title, brand -> brandId, category -> categoryId)
  normalizeCreateProductFields,

  // Multipart i18n alanlarını JSON'a çevir
  transformNestedFields([
    "title",
    "shortDescription",
    "description",
    "slug",
    "tags",
    "seoTitle",
    "seoDescription",
    "seoKeywords",
    "options",
    "dimensions",
    "gallery",
    "attributes",
    "variants",
  ]),

  validateCreateProduct,
  createProduct
);

// UPDATE (multipart/form-data destekli)
router.put(
  "/:id",
  uploadTypeWrapper("product"),
  upload("product").array("images", 10),

  // Güncellemede de legacy alan adlarını toparla (gönderilmişse)
  normalizeCreateProductFields,
  normalizeUpdateProductFields,

  transformNestedFields([
    "title",
    "shortDescription",
    "description",
    "slug",
    "tags",
    "seoTitle",
    "seoDescription",
    "seoKeywords",
    "options",
    "dimensions",
    "gallery",
    "attributes",
    "variants",
    "removedImages",
    "removedImageIds",
    "removedImageUrls",
  ]),
  validateObjectId("id"),
  validateUpdateProduct,
  updateProduct
);

// DELETE
router.delete("/:id", validateObjectId("id"), deleteProduct);

export { router as adminProductRoutes };
export default router;
