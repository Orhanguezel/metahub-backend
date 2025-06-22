import express, { Request, Response, NextFunction } from "express";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  togglePublishStatus,
} from "./admin.product.controller";
import {
  createProductValidator,
  updateProductValidator,
} from "./product.validation";
import { validateRequest } from "@/core/middleware/validateRequest";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { upload } from "@/core/middleware/uploadMiddleware";
import { validateApiKey } from "@/core/middleware/validateApiKey";

const router = express.Router();

// ✅ Apply analyticsLogger middleware to all routes in this router

// POST /admin/products -> Create a product
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  (req: Request, _res: Response, next: NextFunction) => {
    req.uploadType = "product";
    next();
  },
  upload.array("images", 5),
  createProductValidator,
  validateRequest,
  validateApiKey,
  createProduct
);

// PUT /admin/products/:id -> Update a product
router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  (req: Request, _res: Response, next: NextFunction) => {
    req.uploadType = "product";
    next();
  },
  upload.array("images", 5),
  updateProductValidator,
  validateRequest,
  validateApiKey,
  updateProduct
);

// DELETE /admin/products/:id -> Delete a product
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateApiKey,
  deleteProduct
);

// PUT /admin/products/:id/publish -> Toggle publish status
router.put(
  "/:id/publish",
  authenticate,
  authorizeRoles("admin"),
  validateApiKey,
  togglePublishStatus
);

export default router;
