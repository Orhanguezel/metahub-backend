import express from "express";
import routes from "./stockmovement.routes";
const router = express.Router();
router.use("/", routes);
export * from "./stockmovement.controller";
export * from "./stockmovement.models";
export default router;