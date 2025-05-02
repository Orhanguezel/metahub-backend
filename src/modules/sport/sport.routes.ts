import express, { Request, Response, NextFunction } from "express";
import {
  getAllSports,
  createSport,
  getSportById,
  updateSport,
  deleteSport,
} from "./sport.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import upload from "@/core/middleware/uploadMiddleware";
import {
  validateCreateSport,
  validateUpdateSport,
  validateSportId,
} from "./sport.validation";

const router = express.Router();

// ➕ Create sport
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  (req: Request, _res: Response, next: NextFunction) => {
    req.uploadType = "sport";
    next();
  },
  upload.array("images", 5),
  validateCreateSport,
  createSport
);

// 📄 Get all sports
router.get("/", getAllSports);

// 🔍 ID routes
router
  .route("/:id")
  .get(validateSportId, getSportById)
  .put(
    authenticate,
    authorizeRoles("admin"),
    validateSportId,
    (req: Request, _res: Response, next: NextFunction) => {
      req.uploadType = "sport";
      next();
    },
    upload.array("images", 5),
    validateUpdateSport,
    updateSport
  )
  .delete(authenticate, authorizeRoles("admin"), validateSportId, deleteSport);

export default router;
