import express, { Request, Response, NextFunction } from "express";
import {
  createLibraryItem,
  getAllLibraryItems,
  getLibraryItemById,
  getLibraryItemBySlug,
  updateLibraryItem,
  deleteLibraryItem,
} from "./library.controller";

import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";
import upload from "../../core/middleware/uploadMiddleware";

const router = express.Router();

// 🌐 Public Routes
router.get("/", getAllLibraryItems);
router.get("/slug/:slug", getLibraryItemBySlug);
router.get("/:id", getLibraryItemById);

// 🔐 Protected Routes
router.post(
  "/",
  authenticate,
  authorizeRoles("admin", "moderator"),
  (req: Request, _res: Response, next: NextFunction) => {
    req.uploadType = "library";
    next();
  },
  upload.array("files", 2), 
  createLibraryItem
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin", "moderator"),
  (req: Request, _res: Response, next: NextFunction) => {
    req.uploadType = "library";
    next();
  },
  upload.single("file"),
  updateLibraryItem
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  deleteLibraryItem
);

export default router;
