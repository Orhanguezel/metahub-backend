// src/modules/cart/index.ts
import express from "express";
import routes from "./cart.routes";

const router = express.Router();
router.use("/", routes);

export * from "./cart.controller";
export * from "./cart.validation"; // ✅ validasyonlar eklendi
export { default as Cart, ICart, ICartItem } from "./cart.models";

export default router;
