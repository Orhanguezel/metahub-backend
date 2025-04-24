import express from "express";
import routes from "./coupon.routes";

export { default as Coupon } from "./coupon.models";
export * from "./coupon.controller";

const router = express.Router();
router.use("/", routes);

export default router;
