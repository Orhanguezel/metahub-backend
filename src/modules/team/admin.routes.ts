// src/modules/team/admin.team.routes.ts
import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  adminGetAllTeam,
  adminGetTeamById,
  updateTeam,
  deleteTeam,
  createTeam,
} from "./admin.controller";

import {
  validateObjectId,
  validateCreateTeam,
  validateUpdateTeam,
  validateAdminQuery,
} from "./validation";

import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// 🌟 Admin Middleware
router.use(authenticate, authorizeRoles("admin", "moderator"));

// 🌟 Admin Endpoints
router.get("/", validateAdminQuery, adminGetAllTeam);

router.get("/:id", validateObjectId("id"), adminGetTeamById);

router.post(
  "/",
  uploadTypeWrapper("team"),
  upload("team").array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateCreateTeam,
  createTeam
);

router.put(
  "/:id",
  uploadTypeWrapper("team"),
  upload("team").array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateObjectId("id"),
  validateUpdateTeam,
  updateTeam
);

router.delete("/:id", validateObjectId("id"), deleteTeam);

export default router;
