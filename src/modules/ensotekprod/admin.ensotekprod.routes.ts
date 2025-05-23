import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  adminGetAllEnsotekProd,
  adminGetEnsotekProdById,
  updateEnsotekProd,
  deleteEnsotekProd,
  createEnsotekProd,
} from "./admin.ensotekprod.controller";
import {
  validateObjectId,
  validateCreateEnsotekProd,
  validateUpdateEnsotekProd,
  validateAdminQuery,
} from "./ensotekprod.validation";
import { upload } from "@/core/middleware/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// 🌟 Admin Middleware
router.use(authenticate, authorizeRoles("admin", "moderator"));

// 🌟 Admin Endpoints
router.get("/", validateAdminQuery, adminGetAllEnsotekProd);

router.get("/:id", validateObjectId("id"), adminGetEnsotekProdById);

router.post(
  "/",
  uploadTypeWrapper("ensotekprod"),
  upload.array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateCreateEnsotekProd,
  createEnsotekProd
);

router.put(
  "/:id",
  uploadTypeWrapper("ensotekprod"),
  upload.array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateObjectId("id"),
  validateUpdateEnsotekProd,
  updateEnsotekProd
);

router.delete("/:id", validateObjectId("id"), deleteEnsotekProd);

export default router;
