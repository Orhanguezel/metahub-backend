import express from "express";
import {
  getCompanyInfo,
  createCompany,
  updateCompanyInfo,
} from "./company.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";

const router = express.Router();

// GET /company -> Get company info
router.get("/", authenticate, getCompanyInfo);

// POST /company -> Create company (admin only)
router.post("/", authenticate, authorizeRoles("admin"), createCompany);

// PUT /company/:id -> Update company info (admin only)
router.put("/:id", authenticate, authorizeRoles("admin"), updateCompanyInfo);

export default router;
