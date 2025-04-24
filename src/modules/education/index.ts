import express from "express";
import routes from "./education.routes";

export { default as Education } from "./education.models";
export * from "./education.controller";

const router = express.Router();
router.use("/", routes);

export default router;
