import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  createMenuItem,
  updateMenuItem,
  adminGetAllMenuItem,
  adminGetMenuItemById,
  deleteMenuItem
} from "./admin.controller";
import {
  validateObjectId,
  validateCreateMenuItem,
  validateUpdateMenuItem,
  validateAdminQuery
} from "./validation";

import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/", validateAdminQuery, adminGetAllMenuItem);

router.get("/:id", validateObjectId("id"), adminGetMenuItemById);

router.post(
  "/",
  uploadTypeWrapper("menuitem"),
  upload("menuitem").array("images", 10),
  transformNestedFields([
    "name",
    "description",
    "categories",
    "variants",
    "modifierGroups",
    "allergens",
    "additives",
    "dietary",
    "ops"
  ]),
  validateCreateMenuItem,
  createMenuItem
);

router.put(
  "/:id",
  uploadTypeWrapper("menuitem"),
  upload("menuitem").array("images", 10),
  transformNestedFields([
    "name",
    "description",
    "categories",
    "variants",
    "modifierGroups",
    "allergens",
    "additives",
    "dietary",
    "ops"
  ]),
  validateObjectId("id"),
  validateUpdateMenuItem,
  updateMenuItem
);

router.delete("/:id", validateObjectId("id"), deleteMenuItem);

export default router;
