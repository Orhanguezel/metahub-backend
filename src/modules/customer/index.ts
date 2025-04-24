// src/modules/invoice/index.ts
import express from "express";
import routes from "./customer.routes";

const router = express.Router();
router.use("/", routes);

export * from "./customer.controller";
export { default as Customer } from "./customer.models";
export default router;
