import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  adminGetAllRadonarProd,
  adminGetRadonarProdById,
  createRadonarProd,
  updateRadonarProd,
  deleteRadonarProd,
} from "./admin.radonar.prod.controller";
import {
  validateAdminQuery,
  validateCreateRadonarProd,
  validateUpdateRadonarProd,
  validateObjectId,
} from "./radonar.prod.validation";
import {upload} from "@/core/middleware/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// 🌟 Protected admin/moderator routes
router.use(authenticate, authorizeRoles("admin", "moderator"));

// 🔍 List all (admin)
router.get("/", validateAdminQuery, adminGetAllRadonarProd);

// 🔍 Get by ID (admin)
router.get("/:id", validateObjectId("id"), adminGetRadonarProdById);

// ➕ Create product (admin)
router.post(
  "/",
  uploadTypeWrapper("radonarprod"),
  upload.array("images", 5),
  transformNestedFields(["name", "description", "tags"]),
  validateCreateRadonarProd,
  createRadonarProd
);

// ✏️ Update product (admin)
router.put(
  "/:id",
  uploadTypeWrapper("radonarprod"),
  upload.array("images", 5),
  transformNestedFields(["name", "description", "tags"]),
  validateObjectId("id"),
  validateUpdateRadonarProd,
  updateRadonarProd
);

// ❌ Delete product (admin)
router.delete("/:id", validateObjectId("id"), deleteRadonarProd);

export { router as adminRadonarProdRoutes };
export default router;
