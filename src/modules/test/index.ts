import express from "express";
import routes from "./test.routes";

const router = express.Router();
router.use("/", routes);

export * from "./test.controller";
export * from "./test.models";
export default router;