import express from "express";
import routes from "./contact.routes";
import { ContactMessage } from "./contact.models";

const router = express.Router();
router.use("/", routes);

// ✅ Guard + Export (This module has been updated and is now standardized)
export { ContactMessage };
export * from "./contact.controller";
export * from "./contact.validation";

export default router;
