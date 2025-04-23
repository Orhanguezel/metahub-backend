import express from "express";
import routes from "./sport.routes";
const router = express.Router();
router.use("/", routes);
export * from "./sport.controller";
export * from "./sport.models";
export default router;