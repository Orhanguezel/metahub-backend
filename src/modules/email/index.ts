import express from "express";
import routes from "./email.routes";
const router = express.Router();
router.use("/", routes);
export * from "./email.controller";
export * from "./email.models";
export default router;