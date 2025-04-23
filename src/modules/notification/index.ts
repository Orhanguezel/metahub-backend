import express from "express";
import routes from "./notification.routes";
const router = express.Router();
router.use("/", routes);
export * from "./notification.controller";
export * from "./notification.models";
export default router;