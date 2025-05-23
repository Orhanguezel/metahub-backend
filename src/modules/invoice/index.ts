import express from "express";
import invoiceRoutes from "./invoice.routes";
import { Invoice } from "./invoice.models";
import * as invoiceController from "./invoice.controller";

const router = express.Router();
router.use("/", invoiceRoutes);

export { Invoice, invoiceController };
export * from "./invoice.validation";

export default router;
