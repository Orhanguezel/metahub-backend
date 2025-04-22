import express from "express";
import {
  createSparePart,
  getAllSpareParts,
  getSparePartById,
  getSparePartBySlug,
  updateSparePart,
  deleteSparePart,
} from "./sparepart.controller";

import {
  authenticate,
  authorizeRoles,
} from "../../core/middleware/authMiddleware";

const router = express.Router();

// 🌐 Public Routes
router.get("/", getAllSpareParts);
router.get("/slug/:slug", getSparePartBySlug);
router.get("/:id", getSparePartById);

// 🔐 Protected Routes
router.post(
  "/",
  authenticate,
  authorizeRoles("admin", "moderator"),
  createSparePart
);
router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin", "moderator"),
  updateSparePart
);
router.delete("/:id", authenticate, authorizeRoles("admin"), deleteSparePart);

export default router;
