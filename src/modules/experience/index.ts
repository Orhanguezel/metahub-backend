// ✅ index.ts (güncel hali)
import express from "express";
import routes from "./experience.routes";

import { Experience, IExperience } from "./experience.models";

const router = express.Router();
router.use("/", routes);

export { Experience, IExperience };
export * from "./experience.controller";
export * from "./experience.validation";

export default router;
