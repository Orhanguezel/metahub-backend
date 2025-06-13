import express from "express";
import routes from "./library.routes";
import { Library } from "./library.models";
import * as libraryController from "./library.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Guard + Export (standart)
export { Library, libraryController };
export * from "./library.validation";

export default router;
