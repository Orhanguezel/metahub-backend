// src/modules/email/index.ts
import express from "express";
import routes from "./email.routes";
import MailMessage from "./email.models";

const router = express.Router();
router.use("/", routes);

export * from "./email.controller";
export { MailMessage };
export * from "./email.models";
export default router;
