import express from "express";
import { getAllProducts, getProductById } from "./product.controller";

const router = express.Router();

// GET /products -> Get all products
router.get("/", getAllProducts);

// GET /products/:id -> Get product by id
router.get("/:id", getProductById);

export default router;
