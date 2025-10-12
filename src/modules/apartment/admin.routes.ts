import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  adminGetAllApartment,
  adminGetApartmentById,
  updateApartment,
  deleteApartment,
  createApartment,
} from "./admin.controller";

import {
  validateObjectId,
  validateCreateApartment,
  validateUpdateApartment,
  validateAdminQuery,
} from "./validation";

import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// 🌟 Admin Middleware
router.use(authenticate, authorizeRoles("admin", "moderator"));

// 🌟 Admin Endpoints
router.get("/", validateAdminQuery, adminGetAllApartment);

router.get("/:id", validateObjectId("id"), adminGetApartmentById);

router.post(
  "/",
  uploadTypeWrapper("apartment"),
  upload("apartment").array("images", 10),
  // v3: place, snapshots, ops, links eklendi
  transformNestedFields([
    "title",
    "content",
    "address",
    "contact",
    "location",
    "place",
    "snapshots",
    "ops",
    "links"
  ]),
  validateCreateApartment,
  createApartment
);

router.put(
  "/:id",
  uploadTypeWrapper("apartment"),
  upload("apartment").array("images", 10),
  transformNestedFields([
    "title",
    "content",
    "address",
    "contact",
    "location",
    "place",
    "snapshots",
    "ops",
    "links"
  ]),
  validateObjectId("id"),
  validateUpdateApartment,
  updateApartment
);

router.delete("/:id", validateObjectId("id"), deleteApartment);

export default router;
