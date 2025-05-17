import express, { Request, Response, NextFunction } from "express";
import {
  getCompanyInfo,
  createCompany,
  updateCompanyInfo,
} from "./company.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { analyticsLogger } from "@/core/middleware/analyticsLogger";
import upload from "@/core/middleware/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/uploadTypeWrapper";
import {
  validateCreateCompany,
  validateUpdateCompany,
  validateCompanyId,
} from "./company.validation";

const router = express.Router();

// ✅ Public route to get company info
router.get("/", analyticsLogger, getCompanyInfo);

// ✅ Admin-only routes

// POST → create company with optional logo upload
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  uploadTypeWrapper("company"),  // ✅ Doğru middleware
  upload.single("logo"),
  validateCreateCompany,
  createCompany
);

// PUT → update company with optional logo upload
router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  uploadTypeWrapper("company"),  // ✅ Doğru middleware
  upload.single("logo"),
  validateCompanyId,
  validateUpdateCompany,
  updateCompanyInfo
);

export default router;
