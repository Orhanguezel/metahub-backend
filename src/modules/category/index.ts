import express from "express";
import publicRoutes from "./category.routes";
import adminRoutes from "./admin.category.routes";
import { Category } from "./category.models";

const router = express.Router();
router.use("/", publicRoutes);
router.use("/admin", adminRoutes);

// ✅ Guard + Export (This module has been updated and is now standardized)
export { Category };
export * from "./category.controller";
export * from "./admin.category.controller";
export * from "./category.validation";
export * from "./category.models";

export default router;
