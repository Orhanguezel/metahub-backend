import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  adminList, adminGetById, adminUpdateLines, adminChangeStatus, adminAddNote, adminDelete,
} from "./admin.controller";
import {
  validateObjectId, validateAdminListQuery, validateAdminUpdateLines, validateStatusChange, validateAddNote,
} from "./validation";

const router = express.Router();
router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/", validateAdminListQuery, adminList);
router.get("/:id", validateObjectId("id"), adminGetById);
router.put("/:id/lines", validateObjectId("id"), validateAdminUpdateLines, adminUpdateLines);
router.patch("/:id/status", validateObjectId("id"), validateStatusChange, adminChangeStatus);
router.post("/:id/note", validateObjectId("id"), validateAddNote, adminAddNote);
router.delete("/:id", validateObjectId("id"), adminDelete);

export default router;
