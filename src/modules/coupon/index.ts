import express from "express";
import routes from "./coupon.routes";
import { Coupon } from "./coupon.models";

const router = express.Router();
router.use("/", routes);

export { Coupon };
export * from "./coupon.controller";
export * from "./coupon.validation";

export default router;
