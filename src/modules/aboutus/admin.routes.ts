import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  adminGetAllAboutus,
  adminGetAboutusById,
  updateAboutus,
  deleteAboutus,
  createAboutus,
} from "./admin.controller";
import {
  validateObjectId,
  validateCreateAboutus,
  validateUpdateAboutus,
  validateAdminQuery,
} from "./validation";
import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/", validateAdminQuery, adminGetAllAboutus);
router.get("/:id", validateObjectId("id"), adminGetAboutusById);

router.post(
  "/",
  uploadTypeWrapper("about"),
  upload("about").array("images", 10),
  transformNestedFields(["title", "summary", "content", "tags", "slug"]),
  validateCreateAboutus,
  createAboutus
);

router.put(
  "/:id",
  uploadTypeWrapper("about"),
  upload("about").array("images", 10),
  transformNestedFields(["title", "summary", "content", "tags", "slug"]),
  validateObjectId("id"),
  validateUpdateAboutus,
  updateAboutus
);

router.delete("/:id", validateObjectId("id"), deleteAboutus);

export default router;
