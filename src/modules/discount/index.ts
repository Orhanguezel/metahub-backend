import express from "express";
import routes from "./discount.routes";

export { default as Discount } from "./discount.model";
export * from "./discount.controller";

const router = express.Router();
router.use("/", routes);

export default router;
