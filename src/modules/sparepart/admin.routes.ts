import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  adminGetAllSparepart,
  adminGetSparepartById,
  createSparepart,
  updateSparepart,
  deleteSparepart,
} from "./admin.controller";
import {
  validateAdminQuery,
  validateCreateSparepart,
  validateUpdateSparepart,
  validateObjectId,
} from "./validation";
import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// 🌟 Protected admin/moderator routes
router.use(authenticate, authorizeRoles("admin", "moderator"));

// 🔍 List all (admin)
router.get("/", validateAdminQuery, adminGetAllSparepart);

// 🔍 Get by ID (admin)
router.get("/:id", validateObjectId("id"), adminGetSparepartById);

// ➕ Create product (admin)
router.post(
  "/",
  uploadTypeWrapper("sparepart"),
  upload("sparepart").array("images", 5),
  transformNestedFields(["name", "description", "tags"]),
  validateCreateSparepart,
  createSparepart
);

// ✏️ Update product (admin)
router.put(
  "/:id",
  uploadTypeWrapper("sparepart"),
  upload("sparepart").array("images", 5),
  transformNestedFields(["name", "description", "tags"]),
  validateObjectId("id"),
  validateUpdateSparepart,
  updateSparepart
);

// ❌ Delete product (admin)
router.delete("/:id", validateObjectId("id"), deleteSparepart);

export { router as adminSparepartRoutes };
export default router;
