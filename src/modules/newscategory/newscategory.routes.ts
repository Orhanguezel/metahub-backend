import express from "express";
import {
  createNewsCategory,
  getAllNewsCategories,
  getNewsCategoryById,
  updateNewsCategory,
  deleteNewsCategory,
} from "./newscategory.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateCreateNewsCategory,
  validateUpdateNewsCategory,
  validateObjectId,
} from "./newscategory.validation";

const router = express.Router();

router.get("/", getAllNewsCategories);
router.get("/:id", validateObjectId("id"), getNewsCategoryById);

router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateCreateNewsCategory,
  createNewsCategory
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  validateUpdateNewsCategory,
  updateNewsCategory
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  deleteNewsCategory
);

export default router;
