import express from "express";
import routes from "./email.routes";
import MailMessage from "./email.models";

const router = express.Router();
router.use("/", routes);

// ✅ Guard + Export (This module has been updated and is now standardized)
export { MailMessage };
export * from "./email.controller";
export * from "./email.models";
export * from "./email.validation";

export default router;
