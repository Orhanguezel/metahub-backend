import express from "express";
import routes from "./product.routes";
import { Product, IProduct } from "./product.models";

const router = express.Router();
router.use("/", routes);

export * from "./product.controller";
export { Product, IProduct }; 
export default router;
