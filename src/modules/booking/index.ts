import express from "express";
import routes from "./booking.routes";
import { Booking, IBooking } from "./booking.models";
import * as bookingController from "./booking.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Named Exports
export { Booking, IBooking, bookingController };
export * from "./booking.validation";
export * from "./booking.models";
export default router;
