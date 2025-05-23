import express from "express";
import routes from "./notification.routes";
import {Notification} from "./notification.models";
import * as notificationController from "./notification.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Guard + Export (standart yapı)
export { Notification, notificationController };

export * from "./notification.validation";
export * from "./notification.models";

export default router;
