import express from "express";
import routes from "./catalog.routes";
import { CatalogRequest } from "./catalog.models";

const router = express.Router();
router.use("/", routes);

// ✅ Guard + Export (This module has been updated and is now standardized)
export { CatalogRequest };
export * from "./catalog.controller";
export * from "./catalog.validation";

export default router;
