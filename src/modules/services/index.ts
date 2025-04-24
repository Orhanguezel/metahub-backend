// src/modules/services/index.ts
import express from "express";
import routes from "./services.routes";
import Service from "./services.models";

const router = express.Router();
router.use("/", routes);

export * from "./services.controller";
export { Service };
export * from "./services.models";
export default router;
