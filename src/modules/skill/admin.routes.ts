// src/modules/skill/admin.skill.routes.ts
import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  adminGetAllSkill,
  adminGetSkillById,
  updateSkill,
  deleteSkill,
  createSkill,
} from "./admin.controller";

import {
  validateObjectId,
  validateCreateSkill,
  validateUpdateSkill,
  validateAdminQuery,
} from "./validation";

import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// 🌟 Admin Middleware
router.use(authenticate, authorizeRoles("admin", "moderator"));

// 🌟 Admin Endpoints
router.get("/", validateAdminQuery, adminGetAllSkill);

router.get("/:id", validateObjectId("id"), adminGetSkillById);

router.post(
  "/",
  uploadTypeWrapper("skill"),
  upload("skill").array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateCreateSkill,
  createSkill
);

router.put(
  "/:id",
  uploadTypeWrapper("skill"),
  upload("skill").array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateObjectId("id"),
  validateUpdateSkill,
  updateSkill
);

router.delete("/:id", validateObjectId("id"), deleteSkill);

export default router;
