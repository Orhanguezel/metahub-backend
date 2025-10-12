import express from "express";
import {
  getSectionsPublic,
  createSection,
  getSectionsAdmin,
  updateSection,
  toggleSection,
  deleteSection,
} from "./controller";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  validateCreateSection,
  validateUpdateSection,
  validateSectionKeyParam,
  validatePublicListQuery,
} from "./validation";

const router = express.Router();

/** Public: enabled list (opsiyonel filters) */
router.get("/", validatePublicListQuery, getSectionsPublic);

/** Uyumluluk alias: eski FE çağrıları için */
router.get("/published", validatePublicListQuery, getSectionsPublic);

/** Admin: create */
router.post("/", authenticate, authorizeRoles("admin"), validateCreateSection, createSection);

/** Admin: list all (tenant + sayfalama + filtre) */
router.get("/admin", authenticate, authorizeRoles("admin"), getSectionsAdmin);

/** Admin: update by sectionKey */
router.put(
  "/:sectionKey",
  authenticate,
  authorizeRoles("admin"),
  validateSectionKeyParam,
  validateUpdateSection,
  updateSection
);

/** Admin: toggle enabled */
router.patch(
  "/:sectionKey/toggle",
  authenticate,
  authorizeRoles("admin"),
  validateSectionKeyParam,
  toggleSection
);

/** Admin: delete by sectionKey */
router.delete(
  "/:sectionKey",
  authenticate,
  authorizeRoles("admin"),
  validateSectionKeyParam,
  deleteSection
);

export default router;
