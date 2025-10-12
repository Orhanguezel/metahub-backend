import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import { ensureMySeller } from "./mw.ensureMySeller";
import {
  sellerListMyProducts,
  sellerGetMyProductById,
  sellerCreateMyProduct,
  sellerUpdateMyProduct,
  sellerDeleteMyProduct,
} from "./seller.controller";
import {
  validateAdminListQuery,
  validateCreateProduct,
  validateUpdateProduct,
  validateObjectId,
} from "../validation";
import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";
import { normalizeCreateProductFields, normalizeUpdateProductFields } from "../normalizeLegacyFields";

const router = express.Router();

router.use(authenticate, authorizeRoles("seller", "moderator", "admin"));

// LIST
router.get("/", ensureMySeller, validateAdminListQuery, sellerListMyProducts);

// DETAIL
router.get("/:id([0-9a-fA-F]{24})", ensureMySeller, validateObjectId("id"), sellerGetMyProductById);

// CREATE
router.post(
  "/",
  ensureMySeller,
  uploadTypeWrapper("product"),
  upload("product").array("images", 10),
  normalizeCreateProductFields, // ⬅️ legacy FE alanlarını dönüştür
  transformNestedFields([
    "title","shortDescription","description","slug","tags",
    "seoTitle","seoDescription","seoKeywords","options","dimensions",
    "gallery","attributes","variants",
  ]),
  validateCreateProduct,
  sellerCreateMyProduct
);

// UPDATE
router.put(
  "/:id([0-9a-fA-F]{24})",
  ensureMySeller,
  uploadTypeWrapper("product"),
  upload("product").array("images", 10),
  normalizeUpdateProductFields, // ⬅️
  transformNestedFields([
    "title","shortDescription","description","slug","tags",
    "seoTitle","seoDescription","seoKeywords","options","dimensions",
    "gallery","attributes","variants","removedImages","removedImageIds",
    "removedImageUrls",
  ]),
  validateObjectId("id"),
  validateUpdateProduct,
  sellerUpdateMyProduct
);

// DELETE
router.delete("/:id([0-9a-fA-F]{24})", ensureMySeller, validateObjectId("id"), sellerDeleteMyProduct);

export { router as sellerProductRoutes };
export default router;
