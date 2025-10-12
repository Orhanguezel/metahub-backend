import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  createVariant,
  updateVariant,
  deleteVariant,
  adminListVariants,
  adminGetVariantById,
} from "./admin.controller";
import {
  validateCreateVariant,
  validateUpdateVariant,
  validateVariantListQuery,
  validateObjectId,
} from "./validation";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/", validateVariantListQuery, adminListVariants);
router.get("/:id", validateObjectId("id"), adminGetVariantById);

router.post(
  "/",
  transformNestedFields(["options"]),
  validateCreateVariant,
  createVariant
);

router.put(
  "/:id",
  transformNestedFields(["options"]),
  validateObjectId("id"),
  validateUpdateVariant,
  updateVariant
);

router.delete("/:id", validateObjectId("id"), deleteVariant);

export default router;
