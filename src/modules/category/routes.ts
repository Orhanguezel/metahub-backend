import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  getCategoryTree,
  adminListCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "./controller";
import {
  validateCreateCategory,
  validateUpdateCategory,
  validateObjectId,
  validatePublicQuery,
  validateAdminListQuery,
  validateSlugParamOptionalI18n,
} from "./validation";
import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { parseFormDataJson } from "@/core/utils/i18n/parseFormDataJson";

const router = express.Router();

/* 🌍 Public */
router.get("/", validatePublicQuery, getAllCategories);              // ?view=shopo
router.get("/tree", getCategoryTree);
router.get("/slug/:slug", validateSlugParamOptionalI18n, getCategoryBySlug);
router.get("/:id", validateObjectId("id"), getCategoryById);

/* 🔐 Admin */
router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/admin/list", validateAdminListQuery, adminListCategories);

router.post(
  "/",
  upload("category").array("images", 8),
  uploadTypeWrapper("category"),
  parseFormDataJson,
  validateCreateCategory,
  createCategory
);

router.put(
  "/:id",
  upload("category").array("images", 8),
  uploadTypeWrapper("category"),
  parseFormDataJson,
  validateObjectId("id"),
  validateUpdateCategory,
  updateCategory
);

router.delete("/:id", validateObjectId("id"), deleteCategory);

export default router;
