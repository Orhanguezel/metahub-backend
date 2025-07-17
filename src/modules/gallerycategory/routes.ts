import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  createGalleryCategory,
  getAllGalleryCategories,
  getGalleryCategoryById,
  updateGalleryCategory,
  deleteGalleryCategory,
} from "./controller";
import {
  validateCreateGalleryCategory,
  validateUpdateGalleryCategory,
  validateObjectId,
} from "./validation";
import { upload } from "@/core/middleware/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/uploadTypeWrapper";
import { parseFormDataJson } from "@/core/utils/i18n/parseFormDataJson"; // <-- ekle

const router = express.Router();

router.get("/", getAllGalleryCategories);
router.get("/:id", validateObjectId("id"), getGalleryCategoryById);

router.use(authenticate, authorizeRoles("admin", "moderator"));

// ➕ Create gallery category
router.post(
  "/",
  upload("galleryCategory").array("images", 5),
  uploadTypeWrapper("galleryCategory"),
  parseFormDataJson,
  validateCreateGalleryCategory,
  createGalleryCategory
);

// ✏️ Update gallery category
router.put(
  "/:id",
  upload("galleryCategory").array("images", 5),
  uploadTypeWrapper("galleryCategory"),
  parseFormDataJson,
  validateObjectId("id"),
  validateUpdateGalleryCategory,
  updateGalleryCategory
);

router.delete("/:id", validateObjectId("id"), deleteGalleryCategory);

export { router as adminGalleryCategoryRoutes };
export default router;
