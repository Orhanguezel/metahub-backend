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
import { validateApiKey } from "@/core/middleware/validateApiKey";

const router = express.Router();

router.get("/", validateApiKey,getAllBlogs);
router.get("/slug/:slug", validateApiKey,getBlogBySlug);


router.use(authenticate, authorizeRoles("admin"));

router.post(
  "/",
  (req: Request, _res: Response, next: NextFunction) => {
    req.uploadType = "blog";
    next();
  },
  upload.array("images", 5),
  validateCreateBlog,
  validateApiKey,createBlog
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
  validateApiKey,updateBlog
);

router.delete("/:id", validateObjectId("id"), validateApiKey,deleteBlog);

export default router;
