import express from "express";
import routes from "./booking.routes";
import Booking from "./booking.models";

const router = express.Router();
router.use("/", routes);

export * from "./booking.controller";
export * from "./booking.models";
export { Booking };
export default router;
