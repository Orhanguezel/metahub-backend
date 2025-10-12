import express from "express";
import rateLimit from "express-rate-limit";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  createRecipe,
  updateRecipe,
  adminGetAllRecipes,
  adminGetRecipeById,
  deleteRecipe,
} from "./admin.controller";
import {
  validateCreateRecipe,
  validateUpdateRecipe,
  validateAdminQuery,
} from "./validation";
import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// Admin hız limiti (opsiyonel, güvenlik amaçlı)
const ADMIN_WINDOW_MS = Number(process.env.RECIPES_ADMIN_WINDOW_MS || 60_000); // 1 dk
const ADMIN_MAX = Number(process.env.RECIPES_ADMIN_MAX || 60); // 1 dk'da 60 istek
const adminLimiter = rateLimit({
  windowMs: ADMIN_WINDOW_MS,
  max: ADMIN_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(authenticate, authorizeRoles("admin", "moderator"), adminLimiter);

router.get("/", validateAdminQuery, adminGetAllRecipes);
router.get("/:id", adminGetRecipeById);

router.post(
  "/",
  uploadTypeWrapper("recipe"),
  upload("recipe").array("images", 10),
  transformNestedFields(["slug", "title", "description", "cuisines", "tags", "categories", "ingredients", "steps"]),
  validateCreateRecipe,
  createRecipe
);

router.put(
  "/:id",
  uploadTypeWrapper("recipe"),
  upload("recipe").array("images", 10),
  transformNestedFields(["slug", "title", "description", "cuisines", "tags", "categories", "ingredients", "steps"]),
  validateUpdateRecipe,
  updateRecipe
);

router.delete("/:id", deleteRecipe);

export default router;
