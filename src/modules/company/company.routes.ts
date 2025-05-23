import express from "express";
import {
  getCompanyInfo,
  createCompany,
  updateCompanyInfo,
  deleteCompany
} from "./company.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { upload } from "@/core/middleware/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/uploadTypeWrapper";
import {
  validateCreateCompany,
  validateUpdateCompany,
  validateCompanyId,
} from "./company.validation";

const router = express.Router();

// GET: /company
router.get("/", getCompanyInfo);

// POST: /company (çoklu logo)
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  uploadTypeWrapper("company"),
  upload.array("logos", 5),
  validateCreateCompany,
  createCompany
);

// PUT: /company/:id (çoklu logo ve silme desteği)
router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  uploadTypeWrapper("company"),
  upload.array("logos", 5),
  validateCompanyId,
  validateUpdateCompany,
  updateCompanyInfo
);

// DELETE: /company/:id
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateCompanyId,
  deleteCompany
);

export default router;
