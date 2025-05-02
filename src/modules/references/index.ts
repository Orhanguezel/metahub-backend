import express from "express";
import routes from "./references.routes";

// ✅ Model & Controller importları
import Reference from "./references.models";
import * as referencesController from "./references.controller";

// ✅ Router
const router = express.Router();
router.use("/", routes);

// ✅ Guard + Export (standart)
export { Reference, referencesController };
export * from "./references.validation";
export type { IReference } from "./references.models";

export default router;
