import express, { Request, Response, NextFunction } from "express";
import {
  createReference,
  getAllReferences,
  getReferenceBySlug,
  getReferenceById,
  updateReference,
  deleteReference,
} from "./references.controller";

import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import upload from "@/core/middleware/uploadMiddleware";
import {
  validateSlugParam,
  validateIdParam,
  validateCreateReference,
  validateUpdateReference,
} from "./references.validation";

const router = express.Router();

// 🌐 Public Routes
router.get("/", getAllReferences);
router.get("/slug/:slug", validateSlugParam, getReferenceBySlug);
router.get("/:id", validateIdParam, getReferenceById);

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
  validateCreateReference,
  createReference
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin", "moderator"),
  withUploadType("references"),
  upload.array("images", 5),
  validateIdParam,
  validateUpdateReference,
  updateReference
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateIdParam,
  deleteReference
);

export default router;
