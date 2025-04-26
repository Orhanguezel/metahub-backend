// src/modules/notification/index.ts
import express from "express";
import routes from "./notification.routes";

const router = express.Router();
router.use("/", routes);

export * from "./notification.controller";
export { default as Notification, INotification } from "./notification.models";

export default router;
