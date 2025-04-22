import express from "express";
import routes from "./education.routes";

const router = express.Router();
router.use("/", routes);

export * from "./education.controller";
export * from "./education.models";

export default router;
