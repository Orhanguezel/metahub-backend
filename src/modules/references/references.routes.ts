import express, { Request, Response, NextFunction } from "express";
import {
  createReference,
  getAllReferences,
  getReferenceBySlug,
  getReferenceById,
  updateReference,
  deleteReference,
} from "./references.controller";

import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";
import upload from "../../core/middleware/uploadMiddleware";

const router = express.Router();

// 🌐 Public Routes
router.get("/", getAllReferences);
router.get("/slug/:slug", getReferenceBySlug);
router.get("/:id", getReferenceById);

// 🔐 Protected Routes
const withUploadType = (type: string) =>
  (req: Request, _res: Response, next: NextFunction) => {
    req.uploadType = "references";
    next();
  };

router.post(
  "/",
  authenticate,
  authorizeRoles("admin", "moderator"),
  withUploadType("references"),
  upload.array("images", 5),
  createReference
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin", "moderator"),
  withUploadType("references"),
  upload.array("images", 5),
  updateReference
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  deleteReference
);

export default router;
