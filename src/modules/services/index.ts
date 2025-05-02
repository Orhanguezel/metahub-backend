// src/modules/services/index.ts
import express from "express";
import routes from "./services.routes";
import Service, { IService } from "./services.models";
import * as serviceController from "./services.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Guard + Export (standart)
export { Service, IService, serviceController };
export * from "./services.validation";
export default router;
