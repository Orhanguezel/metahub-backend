import express from "express";
import routes from "./appointment.routes";

const router = express.Router();
router.use("/", routes);

export * from "./appointment.controller";
export * from "./appointment.models";

export default router;
