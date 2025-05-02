import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { adminGetAllNews, adminGetNewsById } from "./admin.news.controller";
import { validateObjectId } from "./news.validation";

const router = express.Router();

router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/", adminGetAllNews);
router.get("/:id", validateObjectId("id"), adminGetNewsById);

export default router;
