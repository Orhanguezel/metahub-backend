import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  adminGetAllBike,
  adminGetBikeById,
  createBike,
  updateBike,
  deleteBike,
} from "./admin.controller";
import {
  validateAdminQuery,
  validateCreateBike,
  validateUpdateBike,
  validateObjectId,
} from "./validation";
import { upload } from "@/core/middleware/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// 🌟 Protected admin/moderator routes
router.use(authenticate, authorizeRoles("admin", "moderator"));

// 🔍 List all (admin)
router.get("/", validateAdminQuery, adminGetAllBike);

// 🔍 Get by ID (admin)
router.get("/:id", validateObjectId("id"), adminGetBikeById);

// ➕ Create product (admin)
router.post(
  "/",
  uploadTypeWrapper("bikes"),
  upload("bikes").array("images", 5),
  transformNestedFields(["name", "description", "tags"]),
  validateCreateBike,
  createBike
);

// ✏️ Update product (admin)
router.put(
  "/:id",
  uploadTypeWrapper("bikes"),
  upload("bikes").array("images", 5),
  transformNestedFields(["name", "description", "tags"]),
  validateObjectId("id"),
  validateUpdateBike,
  updateBike
);

// ❌ Delete product (admin)
router.delete("/:id", validateObjectId("id"), deleteBike);

export { router as adminBikeRoutes };
export default router;
