// src/modules/notification/index.ts
import express from "express";
import routes from "./notification.routes";
import Notification from "./notification.models";

const router = express.Router();
router.use("/", routes);

export * from "./notification.controller";
export { Notification };
export * from "./notification.models";
export default router;
