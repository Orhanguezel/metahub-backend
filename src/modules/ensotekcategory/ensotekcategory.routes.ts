import express from "express";
import {
  createEnsotekCategory,
  getAllEnsotekCategories,
  getEnsotekCategoryById,
  updateEnsotekCategory,
  deleteEnsotekCategory,
} from "./ensotekcategory.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateCreateEnsotekCategory,
  validateUpdateEnsotekCategory,
  validateObjectId,
} from "./ensotekcategory.validation";

const router = express.Router();

router.get("/", getAllEnsotekCategories);
router.get("/:id", validateObjectId("id"), getEnsotekCategoryById);

router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateCreateEnsotekCategory,
  createEnsotekCategory
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  validateUpdateEnsotekCategory,
  updateEnsotekCategory
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  deleteEnsotekCategory
);

export default router;
