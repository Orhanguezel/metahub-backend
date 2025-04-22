import express, { Request, Response, NextFunction } from "express";
import {
  getAllSports,
  createSport,
  getSportById,
  updateSport,
  deleteSport,
} from "./sport.controller";
import upload from "../../core/middleware/uploadMiddleware";

const router = express.Router();


// ➕ Yeni spor oluştur
router.post(
  "/",
  // authenticate, authorizeRoles("admin"),
  (req: Request, _res: Response, next: NextFunction) => {
    req.uploadType = "sport"; // Klasör tanımı
    next();
  },
  upload.array("images", 5),
  createSport
);

// 📄 Tüm sporları getir
router.get("/", getAllSports);

// 🔍 ID ile getir / ✏️ Güncelle / 🗑️ Sil
router
  .route("/:id")
  .get(getSportById)
  .put(    (req: Request, _res: Response, next: NextFunction) => {
      req.uploadType = "sport";
      next();
    },
    upload.array("images", 5),
    updateSport
  )
  .delete(
    // authenticate, authorizeRoles("admin"),
    deleteSport
  );

export default router;
