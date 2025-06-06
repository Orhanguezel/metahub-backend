import express from "express";
import routes from "./education.routes";
import Education from "./education.models";

const router = express.Router();
router.use("/", routes);

// ✅ Guard + Export (This module has been updated and is now standardized)
export { Education };
export * from "./education.controller";
export * from "./education.validation";

export default router;
