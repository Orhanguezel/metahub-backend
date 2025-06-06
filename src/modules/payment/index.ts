import express from "express";
import routes from "./payment.routes";
import { Payment } from "./payment.models";
import * as paymentController from "./payment.controller";
import * as paymentTypes from "./types";


const router = express.Router();
router.use("/", routes);

export { Payment, paymentController, paymentTypes };
export * from "./payment.validation";

export default router;
