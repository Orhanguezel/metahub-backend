import express from "express";
import routes from "./coupon.routes";

const router = express.Router();
router.use("/", routes);

export default router;
