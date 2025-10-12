// src/modules/sellers/public.routes.ts
import express from "express";
import {
  getSellerPublicById, updateSellerPublic, listSellersPublic, getMySeller,
  uploadMySellerLogo, uploadMySellerCover, upsertMySellerAddress,
} from "./controller";
import { registerSellerEmail, applyAsSeller } from "./controller.register";
import { authenticate } from "@/core/middleware/auth/authMiddleware";
import {
  validateSellerIdParam,
  updateSellerPublicValidator
} from "./validation";
import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// 1) me ve me/* yolları en üstte
router.get("/me", authenticate, getMySeller);
router.post("/me/logo",  authenticate, uploadTypeWrapper("seller"), upload("seller").single("file"), uploadMySellerLogo);
router.post("/me/cover", authenticate, uploadTypeWrapper("seller"), upload("seller").single("file"), uploadMySellerCover);
router.put("/me/address", authenticate, upsertMySellerAddress);

// 2) diğer public yollar
router.get("/", listSellersPublic);

// 3) id tabanlı yollar EN SONDA ve regex ile
router.get("/:id([0-9a-fA-F]{24})", authenticate, validateSellerIdParam, getSellerPublicById);
router.put(
  "/:id([0-9a-fA-F]{24})",
  authenticate,
  validateSellerIdParam,
  // categories, location, billing, tags json/csv olabilir
  transformNestedFields(["location", "billing", "tags", "categories"]),
  updateSellerPublicValidator,
  updateSellerPublic
);

// 4) kayıt akışları
router.post("/register-email", registerSellerEmail);
router.post("/apply", authenticate, applyAsSeller);

export default router;
