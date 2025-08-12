import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  adminUploadFiles,
  adminListFiles,
  adminGetFileById,
  linkFile,
  unlinkFile,
  deleteFile,
} from "./admin.controller";
import {
  validateObjectId,
  validateAdminListQuery,
  validateLinkPayload,
} from "./validation";

import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { checkFileSizeMiddleware } from "@/core/middleware/file/checkFileSizeMiddleware";

const router = express.Router();

router.use(authenticate, authorizeRoles("admin", "moderator"));

router.post(
  "/",
  uploadTypeWrapper("files"),     // req.uploadSizeLimit burada set olur
  checkFileSizeMiddleware,        // factory değil; direkt middleware
  upload("files").array("files", 10),
  adminUploadFiles
);

router.get("/", validateAdminListQuery, adminListFiles);
router.get("/:id", validateObjectId("id"), adminGetFileById);
router.put("/:id/link", validateObjectId("id"), validateLinkPayload, linkFile);
router.put("/:id/unlink", validateObjectId("id"), validateLinkPayload, unlinkFile);
router.delete("/:id", validateObjectId("id"), deleteFile);

export default router;
