
// src/modules/faq/index.ts
import express from "express";
import routes from "./chat.routes";
import ChatMessage from "./chatMessage.model";

const router = express.Router();
router.use("/", routes);

export * from "./chat.controller";
export { ChatMessage };
export * from "./chatMessage.model";
export default router;

