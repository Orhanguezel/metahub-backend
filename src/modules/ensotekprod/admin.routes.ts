import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  adminGetAllEnsotekprod,
  adminGetEnsotekprodById,
  createEnsotekprod,
  updateEnsotekprod,
  deleteEnsotekprod,
} from "./admin.controller";
import {
  validateAdminQuery,
  validateCreateEnsotekprod,
  validateUpdateEnsotekprod,
  validateObjectId,
} from "./validation";
import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// 🌟 Protected admin/moderator routes
router.use(authenticate, authorizeRoles("admin", "moderator"));

// 🔍 List all (admin)
router.get("/", validateAdminQuery, adminGetAllEnsotekprod);

// 🔍 Get by ID (admin)
router.get("/:id", validateObjectId("id"), adminGetEnsotekprodById);

// ➕ Create product (admin)
router.post(
  "/",
  uploadTypeWrapper("ensotekprod"),
  upload("ensotekprod").array("images", 5),
  transformNestedFields(["name", "description", "tags"]),
  validateCreateEnsotekprod,
  createEnsotekprod
);

// ✏️ Update product (admin)
router.put(
  "/:id",
  uploadTypeWrapper("ensotekprod"),
  upload("ensotekprod").array("images", 5),
  transformNestedFields(["name", "description", "tags"]),
  validateObjectId("id"),
  validateUpdateEnsotekprod,
  updateEnsotekprod
);

// ❌ Delete product (admin)
router.delete("/:id", validateObjectId("id"), deleteEnsotekprod);

export { router as adminEnsotekprodRoutes };
export default router;
