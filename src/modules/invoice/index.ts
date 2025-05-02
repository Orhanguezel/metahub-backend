import express from "express";
import invoiceRoutes from "./invoice.routes";
import Invoice, { IInvoice } from "./invoice.model";
import * as invoiceController from "./invoice.controller";

const router = express.Router();
router.use("/", invoiceRoutes);

export { Invoice, IInvoice, invoiceController };
export * from "./invoice.validation";

export default router;
