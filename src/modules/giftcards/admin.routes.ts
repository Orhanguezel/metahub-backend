import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  adminList, adminGetById, adminIssue, adminTopup,
  adminUpdateMeta, adminDisableEnable, adminDelete
} from "./admin.controller";
import {
  validateAdminList, validateAdminGetById, validateAdminIssue, validateAdminTopup,
  validateAdminUpdateMeta, validateAdminDisableEnable
} from "./validation";

const router = express.Router();
router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/", validateAdminList, adminList);
router.get("/:id", validateAdminGetById, adminGetById);
router.post("/issue", validateAdminIssue, adminIssue);
router.post("/:id/topup", validateAdminTopup, adminTopup);
router.patch("/:id/meta", validateAdminUpdateMeta, adminUpdateMeta);
router.patch("/:id/status", validateAdminDisableEnable, adminDisableEnable);
router.delete("/:id", validateAdminGetById, adminDelete);

export default router;
