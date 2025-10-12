import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  adminList, adminGetById, adminUpload, adminDelete,
  adminUpdateTags, adminReplace, adminSignedParams, uploadMW
} from "./admin.controller";
import {
  validateList, validateGetById, validateUpload,
  validateUpdateTags, validateReplace, validateDelete, validateSignedParams
} from "./validation";

const router = express.Router();
router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/", validateList, adminList);
router.get("/:id", validateGetById, adminGetById);

router.post("/upload", uploadMW.single("file"), validateUpload, adminUpload);
router.put("/:id/tags", validateUpdateTags, adminUpdateTags);
router.put("/:id/replace", uploadMW.single("file"), validateReplace, adminReplace);
router.post("/signed-params", validateSignedParams, adminSignedParams);

router.delete("/:id", validateDelete, adminDelete);

export default router;
