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
import upload from "@/core/middleware/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const adminRouter = express.Router();

// 🌟 Protected admin/moderator routes
adminRouter.use(authenticate, authorizeRoles("admin", "moderator"));

// 🔍 List all (admin)
adminRouter.get("/", validateAdminQuery, adminGetAllRadonarProd);

// 🔍 Get by ID (admin)
adminRouter.get("/:id", validateObjectId("id"), adminGetRadonarProdById);

// ➕ Create product (admin)
adminRouter.post(
  "/",
  uploadTypeWrapper("radonarprod"),
  upload.array("images", 5),
  transformNestedFields(["name", "description", "tags"]),
  validateCreateRadonarProd,
  createRadonarProd
);

// ✏️ Update product (admin)
adminRouter.put(
  "/:id",
  uploadTypeWrapper("radonarprod"),
  upload.array("images", 5),
  transformNestedFields(["name", "description", "tags"]),
  validateObjectId("id"),
  validateUpdateRadonarProd,
  updateRadonarProd
);

// ❌ Delete product (admin)
adminRouter.delete("/:id", validateObjectId("id"), deleteRadonarProd);

export { adminRouter as adminRadonarProdRoutes };
export default adminRouter;
