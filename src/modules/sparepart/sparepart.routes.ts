import express, { Request, Response, NextFunction } from "express";
import {
  createSparePart,
  getAllSpareParts,
  getSparePartById,
  getSparePartBySlug,
  updateSparePart,
  deleteSparePart,
} from "./sparepart.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { upload } from "@/core/middleware/uploadMiddleware";
import {
  validateCreateSparePart,
  validateUpdateSparePart,
  validateSparePartId,
} from "./sparepart.validation";

const router = express.Router();

// 🌐 Public routes
router.get("/", getAllSpareParts);
router.get("/slug/:slug", getSparePartBySlug);
router.get("/:id", validateSparePartId, getSparePartById);

// 🔐 Protected routes
router.post(
  "/",
  authenticate,
  authorizeRoles("admin", "moderator"),
  (req: Request, _res: Response, next: NextFunction) => {
    req.uploadType = "spareparts";
    next();
  },
  upload.array("images", 5),
  validateCreateSparePart,
  createSparePart
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin", "moderator"),
  validateSparePartId,
  (req: Request, _res: Response, next: NextFunction) => {
    req.uploadType = "spareparts";
    next();
  },
  upload.array("images", 5),
  validateUpdateSparePart,
  updateSparePart
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateSparePartId,
  deleteSparePart
);

export default router;
