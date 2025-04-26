import { Router } from "express";
import {
  createComment,
  getAllComments,
  getCommentsForContent,
  togglePublishComment,
  deleteComment,
} from "./comment.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validateObjectId } from "@/core/middleware/validateRequest";

const router = Router();

// 🌍 Public Routes
router.post("/", createComment);
router.get("/:type/:id", validateObjectId("id"), getCommentsForContent);

// 🔐 Admin Routes
router.use(authenticate, authorizeRoles("admin", "moderator"));
router.get("/", getAllComments);
router.put("/:id/toggle", validateObjectId("id"), togglePublishComment);
router.delete("/:id", validateObjectId("id"), deleteComment);

export default router;
