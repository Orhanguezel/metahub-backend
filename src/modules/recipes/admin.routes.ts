// backend/modules/recipes/admin.routes.ts
import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  createRecipe, updateRecipe, adminGetAllRecipes, adminGetRecipeById, deleteRecipe
} from "./admin.controller";
import {
  validateCreateRecipe, validateUpdateRecipe, validateAdminQuery
} from "./validation";
import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/", validateAdminQuery, adminGetAllRecipes);
router.get("/:id", adminGetRecipeById);

router.post(
  "/",
  uploadTypeWrapper("recipe"),
  upload("recipe").array("images", 10),
  transformNestedFields(["slug","title","description","cuisines","tags","categories","ingredients","steps"]),
  validateCreateRecipe,
  createRecipe
);

router.put(
  "/:id",
  uploadTypeWrapper("recipe"),
  upload("recipe").array("images", 10),
  transformNestedFields(["slug","title","description","cuisines","tags","categories","ingredients","steps"]),
  validateUpdateRecipe,
  updateRecipe
);

router.delete("/:id", deleteRecipe);

export default router;
