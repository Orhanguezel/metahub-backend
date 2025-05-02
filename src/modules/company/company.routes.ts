import express from "express";
import {
  getCompanyInfo,
  createCompany,
  updateCompanyInfo,
} from "./company.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { analyticsLogger } from "@/core/middleware/analyticsLogger";
import { validateCreateCompany, validateUpdateCompany, validateCompanyId } from "./company.validation";

const router = express.Router();

// ✅ Public route to get company info
router.get("/", analyticsLogger, authenticate, getCompanyInfo);

// ✅ Admin-only routes
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateCreateCompany,
  createCompany
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateCompanyId,
  validateUpdateCompany,
  updateCompanyInfo
);

export default router;
