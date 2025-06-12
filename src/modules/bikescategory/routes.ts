import express from "express";
import {
  createBikeCategory,
  getAllBikeCategories,
  getBikeCategoryById,
  updateBikeCategory,
  deleteBikeCategory,
} from "./controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateCreateBikeCategory,
  validateUpdateBikeCategory,
  validateObjectId,
} from "./validation";

const router = express.Router();

router.get("/", getAllBikeCategories);
router.get("/:id", validateObjectId("id"), getBikeCategoryById);

router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateCreateBikeCategory,
  createBikeCategory
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  validateUpdateBikeCategory,
  updateBikeCategory
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  deleteBikeCategory
);

export default router;
