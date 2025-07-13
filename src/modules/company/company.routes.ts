// routes/company.router.ts

import express from "express";
import {
  getCompanyInfo,
  createCompany,
  updateCompanyInfo,
  deleteCompany,
} from "./company.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { upload } from "@/core/middleware/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/uploadTypeWrapper";
import {
  validateCreateCompany,
  validateUpdateCompany,
  validateObjectId,  // <-- fonksiyon olarak import
} from "./company.validation";

const router = express.Router();

// GET: /company  — Public info
router.get("/", getCompanyInfo);

// POST: /company — Yalnızca admin, çoklu logo upload destekli
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  uploadTypeWrapper("company"),
  upload.array("images", 5),
  validateCreateCompany,
  createCompany
);

// PUT: /company/:id — Yalnızca admin, çoklu logo, silme desteği
router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  uploadTypeWrapper("company"),
  upload.array("images", 5),
  validateObjectId("id"),    // <-- burada fonksiyon çağrısı ile
  validateUpdateCompany,
  updateCompanyInfo
);

// DELETE: /company/:id — Yalnızca admin, tüm logo dosyalarını da siler
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),    // <-- burada da fonksiyon çağrısı ile
  deleteCompany
);

export default router;
