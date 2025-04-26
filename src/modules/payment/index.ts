import express from "express";
import routes from "./payment.routes";
import Payment from "./payment.models";

const router = express.Router();
router.use("/", routes);

export * from "./payment.controller";
export { Payment };
export * from "./payment.models";
export default router;
