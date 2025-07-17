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
import { parseFormDataJson } from "@/core/utils/i18n/parseFormDataJson"; // <-- ekle

const router = express.Router();

router.get("/", getAllBikeCategories);
router.get("/:id", validateObjectId("id"), getBikeCategoryById);

router.use(authenticate, authorizeRoles("admin", "moderator"));

// ➕ Create bike category
router.post(
  "/",
  upload("bikesCategory").array("images", 5),
  uploadTypeWrapper("bikesCategory"),
  parseFormDataJson,
  validateCreateBikeCategory,
  createBikeCategory
);

// ✏️ Update bike category
router.put(
  "/:id",
  upload("bikesCategory").array("images", 5),
  uploadTypeWrapper("bikesCategory"),
  parseFormDataJson,
  validateObjectId("id"),
  validateUpdateBikeCategory,
  updateBikeCategory
);

router.delete("/:id", validateObjectId("id"), deleteBikeCategory);

export { router as adminBikeCategoryRoutes };
export default router;
