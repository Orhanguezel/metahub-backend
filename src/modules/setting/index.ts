// src/modules/setting/index.ts
import express from "express";
import routes from "./setting.routes";
import Setting from "./setting.models";

const router = express.Router();
router.use("/", routes);

export * from "./setting.controller";
export { Setting };
export * from "./setting.models";
export default router;
