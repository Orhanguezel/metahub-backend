import express from "express";
import {
  createArticlesCategory,
  getAllArticlesCategories,
  getArticlesCategoryById,
  updateArticlesCategory,
  deleteArticlesCategory,
} from "./articlescategory.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validateCreateArticlesCategory, validateUpdateArticlesCategory, validateObjectId } from "./articlescategory.validation";

const router = express.Router();


router.get("/", getAllArticlesCategories);
router.get("/:id", validateObjectId("id"), getArticlesCategoryById);

router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateCreateArticlesCategory,
  createArticlesCategory
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  validateUpdateArticlesCategory,
  updateArticlesCategory
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  deleteArticlesCategory
);


export default router;
