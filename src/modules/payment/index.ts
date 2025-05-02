import express from "express";
import routes from "./payment.routes";
import { Payment } from "./payment.models";
import * as paymentController from "./payment.controller";
export type { IPayment, PaymentMethod, PaymentStatus } from "./payment.models";

const router = express.Router();
router.use("/", routes);

export { Payment, paymentController };
export * from "./payment.validation";

export default router;
