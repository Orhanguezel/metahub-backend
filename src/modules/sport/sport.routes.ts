import express from "express";
import {
  createSport,
  adminGetAllSport,
  adminGetSportById,
  updateSport,
  deleteSport,
  publicGetAllSport,
} from "./sport.controller";

import { upload } from "@/core/middleware/uploadMiddleware";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";
import {
  validateCreateSport,
  validateUpdateSport,
  validateObjectId,
} from "./sport.validation";

const router = express.Router();

// 🛡️ Admin Routes
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  uploadTypeWrapper("sport"),
  upload("sport").array("images", 10),
  transformNestedFields(["label", "description"]),
  validateCreateSport,
  createSport
);

router.get("/admin", authenticate, authorizeRoles("admin"), adminGetAllSport);

router.get(
  "/admin/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  adminGetSportById
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  uploadTypeWrapper("sport"),
  upload("sport").array("images", 10),
  transformNestedFields(["label", "description"]),
  validateObjectId("id"),
  validateUpdateSport,
  updateSport
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  deleteSport
);

// 🌍 Public Route
router.get("/", publicGetAllSport);

export default router;
