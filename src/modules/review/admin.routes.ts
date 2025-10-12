import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import { adminList, adminGetById, adminUpdate, adminChangeStatus, adminDelete } from "./admin.controller";
import { validateObjectId, validateAdminListQuery, validateAdminUpdate, validateChangeStatus } from "./validation";

const router = express.Router();
router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/", validateAdminListQuery, adminList);
router.get("/:id", validateObjectId("id"), adminGetById);
router.put("/:id", validateObjectId("id"), validateAdminUpdate, adminUpdate);
router.patch("/:id/status", validateObjectId("id"), validateChangeStatus, adminChangeStatus);
router.delete("/:id", validateObjectId("id"), adminDelete);

export default router;
