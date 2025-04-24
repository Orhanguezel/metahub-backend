import express, { Request, Response, NextFunction } from "express";
import {
  createNews,
  getAllNews,
  getNewsById,
  getNewsBySlug,
  updateNews,
  deleteNews,
} from "./news.controller";

import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";
import upload from "../../core/middleware/uploadMiddleware";

const router = express.Router();

// 📂 Upload klasörü belirt
const setUploadType = (type: string) => (req: Request, _res: Response, next: NextFunction) => {
  req.uploadType = "news";
  next();
  
};

// 🌍 Public Routes
router.get("/", getAllNews);               // Tüm haberleri getir
router.get("/slug/:slug", getNewsBySlug);  // Slug ile getir
router.get("/:id", getNewsById);           // ID ile getir (admin için de kullanılabilir)

// 🔐 Admin/Mod Routes
router.post(
  "/",
  authenticate,
  authorizeRoles("admin", "moderator"),
  setUploadType("news"),
  upload.array("images", 5),
  createNews
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin", "moderator"),
  setUploadType("news"),
  upload.array("images", 5),
  updateNews
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  deleteNews
);

export default router;
