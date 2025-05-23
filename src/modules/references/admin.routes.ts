import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  adminGetAllReferences,
  adminGetReferenceById,
  updateReference,
  deleteReference,
  createReference,
} from "./admin.controller";
import {
  validateObjectId,
  validateCreateReferences,
  validateUpdateReferences,
  validateAdminQuery,
} from "./validation";
import { upload } from "@/core/middleware/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/", validateAdminQuery, adminGetAllReferences);
router.get("/:id", validateObjectId("id"), adminGetReferenceById);
router.post(
  "/",
  uploadTypeWrapper("references"),
  upload.array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateCreateReferences,
  createReference
);
router.put(
  "/:id",
  uploadTypeWrapper("references"),
  upload.array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateObjectId("id"),
  validateUpdateReferences,
  updateReference
);
router.delete("/:id", validateObjectId("id"), deleteReference);

export default router;
