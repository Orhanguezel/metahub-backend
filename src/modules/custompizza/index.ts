// src/modules/custompizza/index.ts
import express from "express";
import routes from "./custompizza.routes";
import CustomPizza from "./custompizza.models";

const router = express.Router();
router.use("/", routes);

// ✅ Guard + Export (This module has been updated and is now standardized)
export { CustomPizza };
export * from "./custompizza.controller";
export * from "./custompizza.validation";

export default router;
