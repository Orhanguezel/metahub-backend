import express, { Request, Response, NextFunction } from "express";
import {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  deleteService,
} from "./services.controller";

import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import upload from "@/core/middleware/uploadMiddleware";
import {
  validateCreateService,
  validateUpdateService,
  validateObjectId,
} from "./services.validation";

const router = express.Router();

// 🌿 Public routes
router.get("/", getAllServices);
router.get("/:id", validateObjectId("id"), getServiceById);

// 🛠 Admin routes
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  (req: Request, _res: Response, next: NextFunction) => {
    req.uploadType = "service";
    next();
  },
  upload.array("images", 5),
  validateCreateService,
  createService
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  (req: Request, _res: Response, next: NextFunction) => {
    req.uploadType = "service";
    next();
  },
  upload.array("images", 5),
  validateObjectId("id"),
  validateUpdateService,
  updateService
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  deleteService
);

export default router;
