import express from "express";
import routes from "./chat.routes";

const router = express.Router();
router.use("/", routes);

export * from "./chat.controller";
export * from "./chatMessage.model";
export * from "./chatSession.model";

export default router;
