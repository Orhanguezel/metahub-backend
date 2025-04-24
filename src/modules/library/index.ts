// src/modules/library/index.ts
import express from "express";
import routes from "./library.routes";
import LibraryItem from "./library.models";

const router = express.Router();
router.use("/", routes);

export * from "./library.controller";
export { LibraryItem as Library };
export * from "./library.models";
export default router;
