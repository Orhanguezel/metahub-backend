// @/modules/booking/public.routes.ts
import express from "express";
import { createBooking } from "./public.controller";
import { validateCreateBooking } from "./booking.validation";

const router = express.Router();
router.post("/", validateCreateBooking, createBooking);

export default router;
