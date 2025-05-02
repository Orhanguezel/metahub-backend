import express from "express";
import { getAllProducts, getProductById } from "./product.controller";
import { validateApiKey } from "@/core/middleware/validateApiKey";
import { analyticsLogger } from "@/core/middleware/analyticsLogger"; 

const router = express.Router();

// ✅ Apply analytics logger to all public product routes
router.use(analyticsLogger); 

// GET /products -> Get all products
router.get("/", validateApiKey, getAllProducts);

// GET /products/:id -> Get product by id
router.get("/:id", validateApiKey, getProductById);

export default router;
