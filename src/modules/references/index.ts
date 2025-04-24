// src/modules/references/index.ts
import express from "express";
import routes from "./references.routes";
import Reference from "./references.models";

const router = express.Router();
router.use("/", routes);

export * from "./references.controller";
export { Reference };
export * from "./references.models";
export default router;
