// ✅ Router (analyticsLogger middleware added)
import express, { Request, Response, NextFunction } from "express";
import {
  createBlog,
  getAllBlogs,
  getBlogBySlug,
  updateBlog,
  deleteBlog,
} from "./blog.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import upload from "@/core/middleware/uploadMiddleware";
import {
  validateCreateBlog,
  validateUpdateBlog,
  validateObjectId,
} from "./blog.validation";
import { validateApiKey } from "@/core/middleware/validateApiKey";
import { analyticsLogger } from "@/core/middleware/analyticsLogger";

const router = express.Router();

// 🌐 Public Routes
router.get("/", analyticsLogger, validateApiKey, getAllBlogs);
router.get("/slug/:slug", analyticsLogger, validateApiKey, getBlogBySlug);

// 🔐 Admin Routes
router.use(authenticate, authorizeRoles("admin"));

router.post(
  "/",
  (req: Request, _res: Response, next: NextFunction) => {
    req.uploadType = "blog";
    next();
  },
  upload.array("images", 5),
  validateCreateBlog,
  validateApiKey,
  analyticsLogger,
  createBlog
);

router.put(
  "/:id",
  validateObjectId("id"),
  (req: Request, _res: Response, next: NextFunction) => {
    req.uploadType = "blog";
    next();
  },
  upload.array("images", 5),
  validateUpdateBlog,
  validateApiKey,
  analyticsLogger,
  updateBlog
);

router.delete(
  "/:id",
  validateObjectId("id"),
  validateApiKey,
  analyticsLogger,
  deleteBlog
);

export default router;
