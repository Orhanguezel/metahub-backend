// src/routes/blog.routes.ts
import express, { Request, Response, NextFunction } from "express";
import {
  createBlog,
  getAllBlogs,
  getBlogBySlug,
  updateBlog,
  deleteBlog,
} from "./blog.controller";

import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";
import upload from "../../core/middleware/uploadMiddleware";

const router = express.Router();

// 🌍 Public Routes
router.get("/", getAllBlogs);
router.get("/slug/:slug", getBlogBySlug); 


router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  (req: Request, _res: Response, next: NextFunction) => {
    req.uploadType = "blog"; 
    next();
  },
  upload.array("images", 5), 
  createBlog
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  (req: Request, _res: Response, next: NextFunction) => {
    req.uploadType = "blog"; 
    next();
  },
  upload.array("images", 5), 
  updateBlog
);

router.delete("/:id", authenticate, authorizeRoles("admin"), deleteBlog);

export default router;
