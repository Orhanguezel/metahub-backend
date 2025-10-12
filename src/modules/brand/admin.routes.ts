import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  createBrand,
  updateBrand,
  deleteBrand,
  adminGetBrands,
  adminGetBrandById,
} from "./admin.controller";
import {
  validateCreateBrand,
  validateUpdateBrand,
  validateBrandListQuery,
  validateObjectId,
} from "./validation";

const router = express.Router();

// admin/moderator
router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/", validateBrandListQuery, adminGetBrands);
router.get("/:id", validateObjectId("id"), adminGetBrandById);

router.post("/", validateCreateBrand, createBrand);
router.put("/:id", validateObjectId("id"), validateUpdateBrand, updateBrand);

router.delete("/:id", validateObjectId("id"), deleteBrand);

export default router;
