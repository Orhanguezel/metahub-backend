import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  createEnsotekCategory,
  getAllEnsotekCategories,
  getEnsotekCategoryById,
  updateEnsotekCategory,
  deleteEnsotekCategory,
} from "./controller";
import {
  validateCreateEnsotekCategory,
  validateUpdateEnsotekCategory,
  validateObjectId,
} from "./validation";
import { upload } from "@/core/middleware/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/uploadTypeWrapper";
import { parseFormDataJson } from "@/core/utils/i18n/parseFormDataJson"; // <-- ekle

const router = express.Router();

router.get("/", getAllEnsotekCategories);
router.get("/:id", validateObjectId("id"), getEnsotekCategoryById);

router.use(authenticate, authorizeRoles("admin", "moderator"));

// ➕ Create ensotek category
router.post(
  "/",
  upload("ensotekCategory").array("images", 5),
  uploadTypeWrapper("ensotekCategory"),
  parseFormDataJson,
  validateCreateEnsotekCategory,
  createEnsotekCategory
);

// ✏️ Update ensotek category
router.put(
  "/:id",
  upload("ensotekCategory").array("images", 5),
  uploadTypeWrapper("ensotekCategory"),
  parseFormDataJson,
  validateObjectId("id"),
  validateUpdateEnsotekCategory,
  updateEnsotekCategory
);

router.delete("/:id", validateObjectId("id"), deleteEnsotekCategory);

export { router as adminEnsotekCategoryRoutes };
export default router;
