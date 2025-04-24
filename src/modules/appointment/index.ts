import express from "express";
import routes from "./appointment.routes";

export { default as Appointment } from "./appointment.models";
export * from "./appointment.controller";

const router = express.Router();
router.use("/", routes);

export default router;
