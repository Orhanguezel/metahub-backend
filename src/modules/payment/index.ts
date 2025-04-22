import express from "express";
import routes from "./payment.routes";

const router = express.Router();
router.use("/", routes);

export * from "./payment.controller";
export * from "./payment.models";

export default router;
