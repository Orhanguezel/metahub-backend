import express from "express";
import {
  createRadonarCategory,
  getAllRadonarCategories,
  getRadonarCategoryById,
  updateRadonarCategory,
  deleteRadonarCategory,
} from "./radonarcategory.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateCreateRadonarCategory,
  validateUpdateRadonarCategory,
  validateObjectId,
} from "./radonarcategory.validation";

const router = express.Router();

router.get("/", getAllRadonarCategories);
router.get("/:id", validateObjectId("id"), getRadonarCategoryById);

router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateCreateRadonarCategory,
  createRadonarCategory
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  validateUpdateRadonarCategory,
  updateRadonarCategory
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  deleteRadonarCategory
);

export default router;
