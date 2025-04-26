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
import { validateCreateBlog, validateUpdateBlog, validateObjectId } from "./blog.validation";

const router = express.Router();

router.get("/", getAllBlogs);
router.get("/slug/:slug", getBlogBySlug);


router.use(authenticate, authorizeRoles("admin"));

router.post(
  "/",
  (req: Request, _res: Response, next: NextFunction) => {
    req.uploadType = "blog";
    next();
  },
  upload.array("images", 5),
  validateCreateBlog,
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
  updateBlog
);

router.delete("/:id", validateObjectId("id"), deleteBlog);

export default router;
