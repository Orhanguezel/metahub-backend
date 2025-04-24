// src/modules/invoice/index.ts
import express from "express";
import routes from "./invoice.routes";

const router = express.Router();
router.use("/", routes);

export * from "./invoice.controller";
export { default as Invoice, IInvoice } from "./invoice.model";
export default router;
