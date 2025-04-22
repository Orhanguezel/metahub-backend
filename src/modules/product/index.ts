import express from "express";
import routes from "./product.routes";

const router = express.Router();
router.use("/", routes);

export * from "./product.controller";
export * from "./product.models";

export default router;
