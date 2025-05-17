import express from "express";
import chatRoutes from "./chat.routes";
import { ChatMessage, ChatSession } from "./chat.models";

const router = express.Router();
router.use("/", chatRoutes);

// ✅ Guard + Export (This module has been updated and is now standardized)
export { ChatMessage, ChatSession };
export * from "./chat.controller";
export * from "./chat.validation";


export default router;
