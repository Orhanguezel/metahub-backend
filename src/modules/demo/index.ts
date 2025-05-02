// src/modules/demo/index.ts
import express from "express";
import routes from "./demo.routes";
import Demo from "./demo.models";

const router = express.Router();
router.use("/", routes);

// ✅ Guard + Export (This module has been updated and is now standardized)
export { Demo };
export * from "./demo.controller";
export * from "./demo.validation";

export default router;
