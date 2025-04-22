import express from "express";
import routes from "./order.routes";

const router = express.Router();
router.use("/", routes);

export * from "./order.controller";
export * from "./order.models";

export default router;
