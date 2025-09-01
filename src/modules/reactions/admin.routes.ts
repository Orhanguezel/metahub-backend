import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { adminListReactions, adminDeleteReaction, adminDeleteByFilter } from "./admin.controller";
import { validateAdminQuery, validateObjectId } from "./validation";

const router = express.Router();

router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/", validateAdminQuery, adminListReactions);
router.delete("/:id", validateObjectId("id"), adminDeleteReaction);
router.delete("/", adminDeleteByFilter);

export default router;
