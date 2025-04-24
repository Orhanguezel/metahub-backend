// src/modules/invoice/index.ts
import express from "express";
import routes from "./feedback.routes";

const router = express.Router();
router.use("/", routes);

export * from "./feedback.controller";
export { default as Feedback} from "./feedback.models";
export default router;
