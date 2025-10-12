// modules/menucategory/admin.routes.ts
import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  createMenuCategory,
  updateMenuCategory,
  adminGetAllMenuCategory,
  adminGetMenuCategoryById,
  deleteMenuCategory
} from "./admin.controller";
import {
  validateObjectId,
  validateCreateMenuCategory,
  validateUpdateMenuCategory,
  validateAdminQuery
} from "./validation";

import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/", validateAdminQuery, adminGetAllMenuCategory);
router.get("/:id", validateObjectId("id"), adminGetMenuCategoryById);

router.post(
  "/",
  uploadTypeWrapper("menucategory"),
  upload("menucategory").array("images", 10),
  transformNestedFields(["name", "description"]),
  validateCreateMenuCategory,
  createMenuCategory
);

router.put(
  "/:id",
  uploadTypeWrapper("menucategory"),
  upload("menucategory").array("images", 10),
  transformNestedFields(["name", "description"]),
  validateObjectId("id"),
  validateUpdateMenuCategory,
  updateMenuCategory
);

router.delete("/:id", validateObjectId("id"), deleteMenuCategory);

export default router;
