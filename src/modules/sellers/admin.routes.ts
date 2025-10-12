// src/modules/sellers/routes.ts
import express from "express";
import {
  getAllSellers, getSellerById, createSeller, updateSeller, deleteSeller,
} from "./controller";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  createSellerValidator, updateSellerValidator, validateSellerIdParam, sellersAdminQueryValidator,
} from "./validation";
import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

/** ---------------- ADMIN ---------------- */
router.get(
  "/admin",
  authenticate, authorizeRoles("admin"),
  sellersAdminQueryValidator,
  getAllSellers
);

router.get(
  "/admin/:id([0-9a-fA-F]{24})",
  authenticate, authorizeRoles("admin"),
  validateSellerIdParam,
  getSellerById
);

router.post(
  "/admin",
  authenticate, authorizeRoles("admin"),
  uploadTypeWrapper("seller"),
  upload("seller").array("images", 5),
  // categories JSON/csv gelebilir
  transformNestedFields(["addresses", "billing", "tags", "removeImages", "categories"]),
  createSellerValidator,
  createSeller
);

router.put(
  "/admin/:id([0-9a-fA-F]{24})",
  authenticate, authorizeRoles("admin"),
  validateSellerIdParam,
  uploadTypeWrapper("seller"),
  upload("seller").array("images", 5),
  transformNestedFields(["addresses", "billing", "tags", "removeImages", "categories"]),
  updateSellerValidator,
  updateSeller
);

router.delete(
  "/admin/:id([0-9a-fA-F]{24})",
  authenticate, authorizeRoles("admin"),
  validateSellerIdParam,
  deleteSeller
);

export default router;
