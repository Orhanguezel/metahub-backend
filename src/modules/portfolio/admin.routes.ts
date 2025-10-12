// src/modules/portfolio/admin.portfolio.routes.ts
import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  adminGetAllPortfolio,
  adminGetPortfolioById,
  updatePortfolio,
  deletePortfolio,
  createPortfolio,
} from "./admin.controller";

import {
  validateObjectId,
  validateCreatePortfolio,
  validateUpdatePortfolio,
  validateAdminQuery,
} from "./validation";

import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// 🌟 Admin Middleware
router.use(authenticate, authorizeRoles("admin", "moderator"));

// 🌟 Admin Endpoints
router.get("/", validateAdminQuery, adminGetAllPortfolio);

router.get("/:id", validateObjectId("id"), adminGetPortfolioById);

router.post(
  "/",
  uploadTypeWrapper("portfolio"),
  upload("portfolio").array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateCreatePortfolio,
  createPortfolio
);

router.put(
  "/:id",
  uploadTypeWrapper("portfolio"),
  upload("portfolio").array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateObjectId("id"),
  validateUpdatePortfolio,
  updatePortfolio
);

router.delete("/:id", validateObjectId("id"), deletePortfolio);

export default router;
