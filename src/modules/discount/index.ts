// src/modules/discount/index.ts
import express from "express";
import routes from "./discount.routes";
import Discount from "./discount.model";

const router = express.Router();
router.use("/", routes);

// ✅ Guard + Export (This module has been updated and is now standardized)
export { Discount };
export * from "./discount.controller";
export * from "./discount.validation";

export default router;
