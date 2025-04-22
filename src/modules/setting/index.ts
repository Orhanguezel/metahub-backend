import express from "express";
import routes from "./setting.routes";

const router = express.Router();
router.use("/", routes);

export * from "./setting.controller";
export * from "./setting.models";

export default router;
