import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  createSparepartCategory,
  getAllSparepartCategories,
  getSparepartCategoryById,
  updateSparepartCategory,
  deleteSparepartCategory,
} from "./controller";
import {
  validateCreateSparepartCategory,
  validateUpdateSparepartCategory,
  validateObjectId,
} from "./validation";
import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { parseFormDataJson } from "@/core/utils/i18n/parseFormDataJson"; // <-- ekle

const router = express.Router();

router.get("/", getAllSparepartCategories);
router.get("/:id", validateObjectId("id"), getSparepartCategoryById);

router.use(authenticate, authorizeRoles("admin", "moderator"));

// ➕ Create sparepart category
router.post(
  "/",
  upload("sparepartCategory").array("images", 5),
  uploadTypeWrapper("sparepartCategory"),
  parseFormDataJson,
  validateCreateSparepartCategory,
  createSparepartCategory
);

// ✏️ Update sparepart category
router.put(
  "/:id",
  upload("sparepartCategory").array("images", 5),
  uploadTypeWrapper("sparepartCategory"),
  parseFormDataJson,
  validateObjectId("id"),
  validateUpdateSparepartCategory,
  updateSparepartCategory
);

router.delete("/:id", validateObjectId("id"), deleteSparepartCategory);

export { router as adminSparepartCategoryRoutes };
export default router;
