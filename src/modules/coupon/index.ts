import express from "express";
import routes from "./coupon.routes";

const router = express.Router();
router.use("/", routes);

export * from "./coupon.controller";
export { default as Coupon } from "./coupon.models";

export default router;
