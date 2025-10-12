import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  createAttribute,
  updateAttribute,
  deleteAttribute,
  adminGetAttributes,
  adminGetAttributeById,
} from "./admin.controller";
import {
  validateCreateAttribute,
  validateUpdateAttribute,
  validateAttributeListQuery,
  validateObjectId,
} from "./validation";

const router = express.Router();

router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/", validateAttributeListQuery, adminGetAttributes);
router.get("/:id", validateObjectId("id"), adminGetAttributeById);

router.post("/", validateCreateAttribute, createAttribute);
router.put("/:id", validateObjectId("id"), validateUpdateAttribute, updateAttribute);

router.delete("/:id", validateObjectId("id"), deleteAttribute);

export default router;
