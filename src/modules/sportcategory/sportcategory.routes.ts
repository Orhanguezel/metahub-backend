import express from "express";
import {
  createSportCategory,
  getAllSportCategories,
  getSportCategoryById,
  updateSportCategory,
  deleteSportCategory,
} from "./sportcategory.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateCreateSportCategory,
  validateUpdateSportCategory,
  validateObjectId,
} from "./sportcategory.validation";

const router = express.Router();

router.get("/", getAllSportCategories);
router.get("/:id", validateObjectId("id"), getSportCategoryById);

router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateCreateSportCategory,
  createSportCategory
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  validateUpdateSportCategory,
  updateSportCategory
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  deleteSportCategory
);

export default router;
