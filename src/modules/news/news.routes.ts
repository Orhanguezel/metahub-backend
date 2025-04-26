import express, { Request, Response, NextFunction } from "express";
import {
  createNews,
  getAllNews,
  getNewsById,
  getNewsBySlug,
  updateNews,
  deleteNews,
} from "./news.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import upload from "@/core/middleware/uploadMiddleware";
import { validateCreateNews, validateUpdateNews, validateObjectId } from "./news.validation";

const router = express.Router();


const setUploadType = (type: string) => (req: Request, _res: Response, next: NextFunction) => {
  req.uploadType = "news";
  next();
};


router.get("/", getAllNews);           
router.get("/slug/:slug", getNewsBySlug); 
router.get("/:id", validateObjectId("id"), getNewsById); 


router.post(
  "/",
  authenticate,
  authorizeRoles("admin", "moderator"),
  setUploadType("news"),
  upload.array("images", 5),
  validateCreateNews,
  createNews
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin", "moderator"),
  setUploadType("news"),
  upload.array("images", 5),
  validateObjectId("id"),
  validateUpdateNews,
  updateNews
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  deleteNews
);

export default router;
