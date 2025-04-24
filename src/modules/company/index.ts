// src/modules/invoice/index.ts
import express from "express";
import routes from "./company.routes";

const router = express.Router();
router.use("/", routes);

export * from "./company.controller";
export { default as Company } from "./company.models";
export default router;
