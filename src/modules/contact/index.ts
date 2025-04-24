// src/modules/contact/index.ts
import express from "express";
import routes from "./contact.routes";
import ContactMessage from "./contact.models";

const router = express.Router();
router.use("/", routes);

export * from "./contact.controller";
export { ContactMessage };
export * from "./contact.models";
export default router;
