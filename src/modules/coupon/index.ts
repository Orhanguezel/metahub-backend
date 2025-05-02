import express from "express";
import routes from "./coupon.routes";
import { Coupon } from "./coupon.models";

const router = express.Router();
router.use("/", routes);

// ✅ Guard + Export (This module has been updated and is now standardized)
export { Coupon };
export * from "./coupon.controller";
export * from "./coupon.validation";

export default router;
