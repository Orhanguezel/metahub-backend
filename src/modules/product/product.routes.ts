// src/routes/product.routes.ts
import express, { Request, Response, NextFunction } from "express";
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  togglePublishStatus,
} from "./product.controller";
import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";
import upload from "../../core/middleware/uploadMiddleware";

const router = express.Router();

// Public
router.get("/", getAllProducts);
router.get("/:id", getProductById);

// Admin
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  (req: Request, _res: Response, next: NextFunction) => {
    req.uploadType = "product";
    next();
  },
  upload.array("images", 5),
  createProduct
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  (req: Request, _res: Response, next: NextFunction) => {
    req.uploadType = "product";
    next();
  },
  upload.array("images", 5),
  updateProduct
);

router.delete("/:id", authenticate, authorizeRoles("admin"), deleteProduct);
router.put("/:id/publish", authenticate, authorizeRoles("admin"), togglePublishStatus);


export default router;
