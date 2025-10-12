import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  createMenu, updateMenu, adminGetAllMenu, adminGetMenuById, deleteMenu
} from "./admin.controller";
import {
  validateObjectId, validateCreateMenu, validateUpdateMenu, validateAdminQuery
} from "./validation";

import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/", validateAdminQuery, adminGetAllMenu);
router.get("/:id", validateObjectId("id"), adminGetMenuById);

router.post(
  "/",
  uploadTypeWrapper("menu"),
  upload("menu").array("images", 10),
  transformNestedFields(["name", "description", "branches", "categories"]),
  validateCreateMenu,
  createMenu
);

router.put(
  "/:id",
  uploadTypeWrapper("menu"),
  upload("menu").array("images", 10),
  transformNestedFields(["name", "description", "branches", "categories"]),
  validateObjectId("id"),
  validateUpdateMenu,
  updateMenu
);

router.delete("/:id", validateObjectId("id"), deleteMenu);

export default router;
