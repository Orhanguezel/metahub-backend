// src/modules/faq/index.ts
import express from "express";
import routes from "./faq.routes";
import FAQ from "./faq.models";

const router = express.Router();
router.use("/", routes);

export * from "./faq.controller";
export { FAQ };
export * from "./faq.models";
export default router;
