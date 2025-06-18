import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  createBikeCategory,
  getAllBikeCategories,
  getBikeCategoryById,
  updateBikeCategory,
  deleteBikeCategory,
} from "./controller";
import {
  validateCreateBikeCategory,
  validateUpdateBikeCategory,
  validateObjectId,
} from "./validation";
import { upload } from "@/core/middleware/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/uploadTypeWrapper";

const router = express.Router();

// 🔍 List all categories (admin)
router.get("/", getAllBikeCategories);

// 🔍 Get single category by ID
router.get("/:id", validateObjectId("id"), getBikeCategoryById);

router.use(authenticate, authorizeRoles("admin", "moderator"));

// ➕ Create bike category
router.post(
  "/",
  uploadTypeWrapper("bikesCategory"),
  validateCreateBikeCategory,
  createBikeCategory
);

// ✏️ Update bike category
router.put(
  "/:id",
  uploadTypeWrapper("bikesCategory"),
  validateObjectId("id"),
  validateUpdateBikeCategory,
  updateBikeCategory
);

// ❌ Delete bike category
router.delete("/:id", validateObjectId("id"), deleteBikeCategory);

export { router as adminBikeCategoryRoutes };
export default router;
