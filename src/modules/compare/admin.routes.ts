import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  adminListCompares,
  adminGetCompareById,
  adminDeleteCompare,
} from "./admin.controller";
import { validateObjectId, validateListQuery } from "./validation";

const router = express.Router();
router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/", validateListQuery, adminListCompares);
router.get("/:id", validateObjectId("id"), adminGetCompareById);
router.delete("/:id", validateObjectId("id"), adminDeleteCompare);

export default router;
